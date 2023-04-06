#!/usr/bin/env python
## Download DASH files: manifest.mpd, init.mp4, 1.m4s, 2.m4s, ...
## Versions:
##   1.3/2023-04-04: fixed segNumber formula for live edge download
##   1.2/2023-03-11: test "$Number%05d$" mediaurl syntax
##   1.1/2022-12-08: contentType="image" thumbnail adaptation set
##   1.0/2022-11-21: initial version
##
## python3 DownloadSegments.py --help
## python3 DownloadSegments.py --input="https://server.com/video1.mpd" --output="/videos/video1" --merge=1 --maxsegments=10 --logfile="/videos/video1/log.txt"
## python3 DownloadSegments.py --input="https://server.com/video1.mpd" --output="/videos/video1" --merge=1 --maxsegments=10 --reverse=1

import sys, os, io, codecs, subprocess, time, datetime, json, socket, platform, ntpath
import calendar, unicodedata
from optparse import OptionParser
import urllib.request as urllib_request
from urllib.parse import urlparse, parse_qs, urlencode
from xml.etree import cElementTree as ET

##########################################

BASEDIR = os.path.dirname(os.path.realpath(__file__)) ## python script dir "/opt/my/app"
WORKDIR = os.getcwd() ## current working dir "/home/dash/video1"

fLogfile = None

##########################################

class MediaManifest:
	def __init__(self):
		self.baseUrl = ""  ## baseUrl from url or topmost MPD.Period element
		self.duration = 0  ## MPD@mediaPresentationDuration(vod) or MPD@timeShiftBufferDepth(live) in milliseconds
		self.live = False
		self.nowTime = None
		self.availabilityStartTime = None ## MPD@availabilityStartTime (live)
		self.publishTime = None  ## MPD@publishTime (live)
		self.sets = []     ## AdaptationSet array

class MediaSet: ## Dash <AdaptationSet>
	def __init__(self):
		self.tracks = [] ## 1..n bitrates for video
		
class MediaTrack: ## Dash <Representation>
	def __init__(self):
		self.baseUrl  = ""
		self.id       = ""
		self.type     = ""  ## video,audio,subtitle,image,..
		self.subtype  = ""  ## jpeg,png
		self.width    = 0
		self.height   = 0
		self.bitrate  = 0
		self.initSegment = None
		self.segments = []
		self.downloadCount = 0  ## num of segments already downloaded
		self.outputFile = None  ## used for merge(append) write
		
class MediaSegment: ## segment $Number or $Time syntax
	def __init__(self):
		self.number = 0  ## sequence number 1..n
		self.url    = ""
		self.time   = -1    ## <S t="123"> time
		#self.byteRangeOffset = 0 ## PartialDownload not supported yet
		#self.byteRangeLength = 0
		
##########################################

def printLog(str, fileOut=True, ioOut=True):
## print to SYSOUT and optional logfile
	global fLogfile
	if ioOut:
		print(str)
	if fileOut and fLogfile is not None:
		fLogfile.write(str + "\n")
		fLogfile.flush()

def getYMDHMS(dt=None):
## returns "YYYY-MM-DDThh:mm:ss" string
	if dt==None: dt=datetime.datetime.now()
	return datetime.datetime.strftime(dt, '%Y-%m-%dT%H:%M:%S')

def parse_isodatetime(str):
## "2022-11-25T07:27:53Z" -> dt.timestamp() -> 1669361273 utc seconds
## "1970-01-01T00:00:00.000Z", "2022-11-25T13:37:24.282Z"
	#str = str.replace("Z", "+00:00")
	#return datetime.datetime.fromisoformat(str)
	delim = str.rfind(".")
	if delim<0:
		return datetime.datetime.strptime(str, "%Y-%m-%dT%H:%M:%S%z")
	else:
		return datetime.datetime.strptime(str, "%Y-%m-%dT%H:%M:%S.%f%z")

def parse_isoduration(str):
## https://stackoverflow.com/questions/36976138/is-there-an-easy-way-to-convert-iso-8601-duration-to-timedelta
## "PT1H30M15.460S", "P5DT4M", "P2WT3H", "PT1H46M33.994000000S"
## Parse the ISO8601 duration as years,months,weeks,days, hours,minutes,seconds
## returns milliseconds
	def get_isosplit(str, split):
		if split in str:
			n, str = str.split(split, 1)
		else:
			n = '0'
		return n.replace(',', '.'), str  # to handle like "P0,5Y"

	str = str.split('P', 1)[-1]  # Remove prefix
	if not(str.startswith("T")):
		s_yr, str = get_isosplit(str, 'Y')  # Step through letter dividers
		s_mo, str = get_isosplit(str, 'M')
		s_wk, str = get_isosplit(str, 'W')
		s_dy, str = get_isosplit(str, 'D')
	else:
		s_yr = s_mo = s_wk = s_dy = 0 ## no YearMonthWeekDay duration fields
	
	_, str    = get_isosplit(str, 'T')
	s_hr, str = get_isosplit(str, 'H')
	s_mi, str = get_isosplit(str, 'M')
	s_sc, str = get_isosplit(str, 'S')
	n_yr = float(s_yr) * 365   # approx days for year, month, week
	n_mo = float(s_mo) * 30.4
	n_wk = float(s_wk) * 7
	dt = datetime.timedelta(days=n_yr+n_mo+n_wk+float(s_dy), hours=float(s_hr), minutes=float(s_mi), seconds=float(s_sc))
	return int(dt.total_seconds()*1000) ## int(dt.total_seconds()) | dt
		
def getXMLRootWithoutNamespaces(str):
## remove namespaces from xml elements and attributes
	#instead of ET.fromstring(xml)
	#tree = ET.parse(sManifestFile)
	#root = tree.getroot() ## <MPD> element
	#it = ET.iterparse(io.StringIO(buf.decode("utf-8", "ignore")))
	it = ET.iterparse(io.StringIO(str))
	for _, el in it:
		if '}' in el.tag:
			el.tag = el.tag.split('}', 1)[1]  # strip all namespaces
		for at in list(el.attrib.keys()): # strip namespaces of attributes too
			if '}' in at:
				newat = at.split('}', 1)[1]
				el.attrib[newat] = el.attrib[at]
				del el.attrib[at]	
	return it.root
	
def getXMLAttribute(elem, key, defval):
	if key in elem.attrib:
		return elem.attrib[key]
	return defval
	
def getBaseUrl(elem, prevBaseUrl):
	elem = elem.find("BaseURL")
	if elem is None: return prevBaseUrl;
	val = elem.text
	return val if val.find("http")==0 else prevBaseUrl+val

##########################################
	
def main():
	global fLogfile
	## parse command line arguments(not used, always use cid arg)
	parser = OptionParser(add_help_option=False, description="Download dash segments")
	parser.add_option("-h", "--help", action="help")
	parser.add_option("--input", type="string", dest="input", help="Input manifest url (https://server.com/video1/manifest.mpd)")
	parser.add_option("--output", type="string", dest="output", help="Output folder (/tmp/video1)")
	parser.add_option("--logfile", type="string", default="", dest="logfile", help="Optional logfile (/tmp/video1/log.txt)")
	parser.add_option("--maxsegments", type="int", default=-1, dest="maxSegments", help="Optional max number of segments (1..n)")
	parser.add_option("--maxduration", type="int", default=-1, dest="maxDuration", help="Optional media duration secs (1..n)")
	parser.add_option("--outputfilename", type="string", default="number", dest="outputfilename", help="Optional use $time in segment filenames (number,time)")
	parser.add_option("--reverse", type="int", default=0, dest="reverse", help="Read max number of segments from the end (1,0)")
	parser.add_option("--liveedge", type="int", default=1, dest="liveedge", help="Use live edge timestamp (1,0)")
	parser.add_option("--merge", type="int", default=0, dest="merge", help="Merge segment files (1,0)")	
	parser.add_option("--repids", type="string", default="", dest="repids", help="Optional representation ids (id1,id2,id3)")
	parser.add_option("--download", type="int", default=1, dest="download", help="Download segments (1,0)")	
	parser.add_option("--baseurl", type="string", default="", dest="baseUrl", help="Optional BaseURL for segment files (https://cdn.com/dash/)")
	(options, args) = parser.parse_args()	
	if(options.input==None or options.input=="" 
			or options.output==None or options.output==""):
		parser.print_help()
		return;

	if options.output=="" or options.output=="." or options.output=="./":
		options.output=WORKDIR
	else:
		sFolder = options.output
		if not os.path.exists(sFolder): os.makedirs(sFolder)

	if options.logfile != "":
		delim = options.logfile.rfind("/")
		if delim>0:
			sFolder = options.logfile[0:delim+1]
			if not os.path.exists(sFolder): os.makedirs(sFolder)
		fLogfile = codecs.open(options.logfile,"w","utf-8")

	#now  = datetime.datetime.utcnow()
	#sNow = datetime.datetime.strftime(now, '%Y-%m-%dT%H:%M:%SZ')
	start = datetime.datetime.now()
	printLog("%s Start" % (getYMDHMS(start)) )
	printLog("Input manifest: %s" % (options.input) )
	printLog("Output folder: %s" % (options.output) )
	printLog("Merge segments: %d" % (options.merge) )
	printLog("Reverse ordering: %d" % (options.reverse) )
	printLog("Representation ids: %s" % (options.repids) )	
	printLog("BaseURL: %s" % (options.baseUrl) )

	if options.download==0:
		options.merge=0 ## if download=0(false) then do not use merge mode

	sManifestFile=""
	if options.input.lower().find("http")==0:
		if options.outputfilename=="time":
			val = getYMDHMS().replace(":","").replace("-","") ## manifest_YYYYMMDDThhmmss.mpd
			sManifestFile=options.output+"/manifest_"+val+".mpd"
		else:
			sManifestFile=options.output+"/manifest.mpd"
		printLog("%s Reading manifest" % (getYMDHMS()) )
		buf = urllib_request.urlopen(options.input).read()
		with open(sManifestFile, 'wb') as output:
			output.write(buf)
	else:
		sManifestFile = options.input

	fFile = codecs.open(sManifestFile,'r',encoding='utf-8')
	buf = fFile.read()
	root = getXMLRootWithoutNamespaces(buf)

	manifest = MediaManifest()
	manifest.nowTime=datetime.datetime.now() ## nowTime.timestamp() -> utcSeconds
	
	manifest.live = getXMLAttribute(root, "type", "")=="dynamic"
	if manifest.live:
		if options.maxSegments < 0: options.maxSegments=40 ## default limit for live segcount
	else:
		if options.maxSegments < 0: options.maxSegments=sys.maxsize-1 ## read all vod segments
	
	if options.baseUrl != "": 
		manifest.baseUrl = options.baseUrl ## "https://cdn.com/segment/files/"
	else:
		delim = options.input.rfind("/")
		manifest.baseUrl = options.input[0:delim+1] ## "https://my.server.com/video/manifest.mpd" -> "https://my.server.com/video/"
		manifest.baseUrl = getBaseUrl(root, manifest.baseUrl) ## mpdUrl or MPD.BaseURL as a topmost url	
	
	##FIXME: calc availabilityStartTime+publishTime LIVE incremental +1..n
	##- double check calc works properly to download N most recent segments
	
	## LIVE does not have a fixed total duration field, default to 30min if duration not found
	strDur=""
	if options.maxDuration<0:
		val = getXMLAttribute(root, "mediaPresentationDuration", "PT0S")
		if val=="PT0S": val = getXMLAttribute(root, "timeShiftBufferDepth", "PT30M")
		manifest.duration = parse_isoduration(val)  ## milliseconds
		strDur = val;
	else:
		manifest.duration = options.maxDuration*1000
	
	val = getXMLAttribute(root, "availabilityStartTime", "")
	if val!="": manifest.availabilityStartTime = parse_isodatetime(val)
	val = getXMLAttribute(root, "publishTime", "")
	if val!="": manifest.publishTime = parse_isodatetime(val)
	
	printLog("Manifest baseUrl: %s" % (manifest.baseUrl))
	printLog("MediaDurationSec: %d" % (manifest.duration/1000))
	if strDur!="": printLog("MediaDurationISO8601: %s" % (strDur))
	
	if manifest.availabilityStartTime is not None:
		printLog("AvailabilityStartTime: %sZ" % (getYMDHMS(manifest.availabilityStartTime)))
		printLog("AvailabilityEpocSec: %d" % (manifest.availabilityStartTime.timestamp()))
	if manifest.publishTime is not None:
		printLog("PublishTime: %sZ" % (getYMDHMS(manifest.publishTime)))
		printLog("PublishEpocSec: %d" % (manifest.publishTime.timestamp()))
		
	printLog("manifest=%s" % (sManifestFile) )

	arrRepIds = [] if options.repids=="" else options.repids.split(",")	
	for elemPeriod in root.iter("Period"):
		sBaseUrlPeriod = getBaseUrl(elemPeriod, manifest.baseUrl)
		for elemAset in elemPeriod.iter("AdaptationSet"):
			sBaseUrlAset = getBaseUrl(elemAset, sBaseUrlPeriod)
			sType= getXMLAttribute(elemAset, "contentType", "")
			sMimeType = getXMLAttribute(elemAset, "mimeType", "")

			delim = sMimeType.find("/")
			if delim>0 and sType=="": sType=sMimeType[0:delim]
			sSubtype = sMimeType[delim+1:] if delim>0 else ""
			
			mset = MediaSet() ## AdaptationSet has 1..n tracks(bitrates|resolutions)
			manifest.sets.append(mset)						
			
			## this element may also be found in "AdaptationSet/Representation/SegmentTemplate"
			segTemplateAset = elemAset.find("SegmentTemplate")
			for elemRep in elemAset.iter("Representation"):
				track = MediaTrack()
				track.baseUrl= sBaseUrlAset
				track.id     = getXMLAttribute(elemRep, "id", "") ## $RepresentationID$

				if len(arrRepIds)>0 and track.id not in arrRepIds:
					continue ## skip this track

				## read type if AdaptationSet had an empty value
				sMimeType = getXMLAttribute(elemRep, "mimeType", "")
				delim = sMimeType.find("/")
				if sType==""    and delim>0: sType   = sMimeType[0:delim]
				if sSubtype=="" and delim>0: sSubtype= sMimeType[delim+1:]

				track.type   = sType ## video,audio,..
				track.subtype= sSubtype ## jpeg,png
				track.width  = int( getXMLAttribute(elemRep, "width", "0") )
				track.height = int( getXMLAttribute(elemRep, "height", "0") )
				track.bitrate= int( getXMLAttribute(elemRep, "bandwidth", "0") ) ## $Bandwidth$
				mset.tracks.append(track)
				
				segTemplate = segTemplateAset
				segTemplateRep = elemRep.find("SegmentTemplate")
				if segTemplateRep is not None: segTemplate = segTemplateRep
										
				## create a list of all segment URLs before downloading any files
				appendSegmentUrls(manifest, segTemplate, track, options.liveedge)
			##endof-Representation
		##endOf-AdaptationSet
	##endOf-Period


	## download all init.mp4 files
	trackCount=0
	for mset in manifest.sets:
		for track in mset.tracks:
			trackCount=trackCount+1
			printLog("type%d=%s, id=%s, bitrate=%d, width=%d, height=%d, segcount=%d" % (
				trackCount, track.type, track.id, track.bitrate, 
				track.width, track.height, len(track.segments)
			))
			printLog("init%d=%s" % (trackCount, track.initSegment.url))
						
			sFolder = options.output + "/" + track.id
			if not os.path.exists(sFolder): os.makedirs(sFolder)
			
			## write and overwrite output file, 
			## then open for append mode if should merge all segments
			sFilename = "init.mp4" if options.merge==0 else "track.mp4" ##track.id+".mp4"
			if options.download==1:
				if track.initSegment.url!="":
					buf = urllib_request.urlopen( track.initSegment.url ).read()
					with open(sFolder+"/"+sFilename, 'wb') as output:
						output.write(buf)
			if options.merge==1:
				track.outputFile = open(sFolder+"/"+sFilename, 'ab')
			
	## reverse segment download, max N from the end, useful for LIVE stream
	if options.reverse:
		for mset in manifest.sets:
			for track in mset.tracks:
				segCount = len(track.segments)
				if segCount <= options.maxSegments: continue
				startIdx = segCount-options.maxSegments;
				track.segments = track.segments[startIdx:segCount]

	## download segments in sync over all tracks (1st from all bitrates, 2nd from all bitrates, ..)
	startSegment=1
	for segNumber in range(startSegment, options.maxSegments+1):
		for mset in manifest.sets:
			for track in mset.tracks:
				if track.downloadCount > options.maxSegments: break
				track.downloadCount = track.downloadCount+1
				if track.downloadCount > len(track.segments): break
		
				seg = track.segments[track.downloadCount-1]
				printLog("seg%d=%s" % (seg.number, seg.url))								

				if options.download==1:
					buf = urllib_request.urlopen( seg.url ).read()				
					if options.merge==0:
						sFolder  = options.output + "/" + track.id
						sFilename= ""
						sFileext = ".m4s"
						if   track.subtype=="jpeg": sFileext=".jpg"
						elif track.subtype=="jpg" : sFileext=".jpg"
						elif track.subtype=="png" : sFileext=".png"
						if options.outputfilename=="time":
							sFilename=str(seg.time)+sFileext
						else:
							sFilename=str(seg.number)+sFileext
						with open(sFolder+"/"+sFilename, 'wb') as output:
							output.write(buf)
					else:
						track.outputFile.write(buf) ## merge all segments
	## endOf-range(segs)
	
	## close output files if merge mode was enabled
	for mset in manifest.sets:
		for track in mset.tracks:
			if track.outputFile is None: continue
			track.outputFile.close()
	
	printLog("%s End" % (getYMDHMS()))
	if not fLogfile is None:
		fLogfile.close()
	

def appendSegmentUrls(manifest, segTemplate, track, useLiveEdge):
## loop segment urls, variables: $RepresentationID$, $Number$, $Time$, $Bandwidth$
	## init.mp4 initialization segment
	sUrl = getXMLAttribute(segTemplate, "initialization", "") ## name-$RepresentationID$.mp4
	sUrl = sUrl.replace("$RepresentationID$", track.id)
	sUrl = sUrl.replace("$Bandwidth$", str(track.bitrate))
	track.initSegment = MediaSegment()
	track.initSegment.number = 0
	track.initSegment.url = track.baseUrl + sUrl if sUrl!="" else ""
	
	## seg1.m4s, seg2.m4s media segments
	segNumber    = int(getXMLAttribute(segTemplate, "startNumber", "1"))
	sUrlTemplate = getXMLAttribute(segTemplate, "media", "") ## "name-$RepresentationID$-$Time$.m4s", "name-$RepresentationID$-$Number$.m4s"
	sUrlTemplate = sUrlTemplate.replace("$RepresentationID$", track.id)
	sUrlTemplate = sUrlTemplate.replace("$Bandwidth$", str(track.bitrate))

	##FIXME: verify live $Number from availabilitityStartTime,currenTime calculation
	##FIXME: fix "$Number%05d$" syntax
	numberVar="$Number$"
	numberFormat="{:0>1d}"
	delim = sUrlTemplate.find(numberVar)
	if delim<0:
		numberVar="$Number%05d$"  ## hardcoded for testing use only
		numberFormat="{:0>5d}"
		delim = sUrlTemplate.find(numberVar)

	elemTimeline = segTemplate.find("SegmentTimeline")
	if elemTimeline is not None:
		## download <SegmentTimeline><S> elements
		t = 0
		for elemSeg in elemTimeline.iter("S"):
			t = int(getXMLAttribute(elemSeg, "t", str(t))) ## (t)imestamp
			d = int(getXMLAttribute(elemSeg, "d", "0"))    ## (d)uration
			r = int(getXMLAttribute(elemSeg, "r", "0"))+1  ## (r)epeat segs
			for idx in range(0,r):
				sUrl = sUrlTemplate.replace("$Time$", str(t))
				sUrl = sUrl.replace(numberVar, numberFormat.format(segNumber))
				seg = MediaSegment()
				seg.number = segNumber
				seg.url = track.baseUrl + sUrl
				seg.time= t
				track.segments.append(seg)			
				t = t+d ## increment timestamp and segment number
				segNumber=segNumber+1
	else:
		## download totalDuration/segmentDuration=number of N elements
		val = getXMLAttribute(segTemplate, "duration", "0")
		d = 0 ## 384000, segment duration in timescale
		if val.rfind(".")>0:
			printLog("Info: floating point duration (track=%s, value=%s)" % (track.id, val))
			d = int(float(val))
		else:
			d = int(val)
		tscale = int(getXMLAttribute(segTemplate, "timescale", "1"))
		segDur = int(d / tscale) ## seconds (384000 / 48000 = 8sec one segment)
		totDur = int(manifest.duration  / 1000) ## total duration in seconds
		if manifest.live and useLiveEdge:
			## forward to "mostRecentNumber - mediaDurationSegCount" seg number
			## (currentTime - astTime) / (duration / timescale) + 1 = number of most recent segment
			segNumberOrig= segNumber
			astMillis    = int(manifest.availabilityStartTime.timestamp()*1000)
			segNumberEdge= int( ((manifest.nowTime.timestamp()*1000) - astMillis) / (d / tscale *1000) +1 )
			segNumberEdge= segNumber+segNumberEdge
			segNumber    = segNumberEdge - int(totDur/segDur)
			printLog("%s: segNumberOrig=%d, segNumber=%d, segNumberEdge=%d" % (track.id, segNumberOrig,segNumber,segNumberEdge) )

		for idx in range(1, int(totDur/segDur)+1):
			sUrl = sUrlTemplate.replace(numberVar, numberFormat.format(segNumber)) #sUrlTemplate.replace(numberVar, str(segNumber))
			seg = MediaSegment()
			seg.number = segNumber
			seg.url = track.baseUrl + sUrl
			seg.time= d*(segNumber-1)
			track.segments.append(seg)			
			segNumber=segNumber+1
		

######################################################
if __name__ == "__main__":
	main()
