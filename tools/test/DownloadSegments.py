#!/usr/bin/env python
## Download DASH segment files to a local disk
##  python.exe DownloadSegments.py --input="http://server.com/my/dash.mpd" --output="/tmp/outputfolder"
## Aki Nieminen/Sofia Digital
## 2018-09-10/Aki: initial release (supports simple vod manifest only)

## Python2=urllib2, Python3=urllib.request
##   buf = urllib2.urlopen(url).read()
##   buf = urllib.request.urlopen(url).read()
import sys, os, codecs, subprocess, shutil, zipfile, time, datetime, json, socket, platform
import calendar
from optparse import OptionParser
try:
	import urllib.request as urllib_request
except ImportError:
	import urllib2 as urllib_request
#try:
#	from xml.etree import ElementTree
#except ImportError:
from xml.etree import cElementTree as ElementTree
	

##########################################

BASEDIR     = os.path.dirname(os.path.realpath(__file__)) ## script folder "/opt/my/sub"

##########################################
	
def main():
	## parse command line arguments
	parser = OptionParser(add_help_option=False)
	parser.add_option("-h", "--help", action="help")
	parser.add_option("--input", type="string", dest="input", help="Input mpd")
	parser.add_option("--output", type="string", dest="output", help="Output folder")
	parser.add_option("--download", type="int", dest="download", default=1, help="Download segments(1/0)")
	(options, args) = parser.parse_args()
	for opt in {"input","output"}:
		if options.__dict__[opt] is None: parser.error("parameter %s is missing"%opt)	
	#for opt in {"somekey3"}:
	#	if options.__dict__[opt] is None: options.__dict__[opt]="" ## Cast none to empty string

	#now = datetime.datetime.utcnow()
	
	## store original manifest to an output folder
	## this script does not modify manifest to use a relative segment urls
	buf = urllib_request.urlopen(options.input).read()
	with open(options.output+"/manifest_original.mpd", 'wb') as output:
		output.write(buf)

	## loop all <Representation> elements and parse init+mediaurl links
	BaseURL=""
	duration=0
	files = []
	files.append(options.input)	
	
	xmlRoot=ElementTree.fromstring(buf)
	elemSeg = None
	elems = xmlRoot.iter()
	for elem in elems:
		tag = elem.tag if '}' not in elem.tag else elem.tag.split('}', 1)[1] ## drop leading namespace identifier
		if tag=="MPD":
			duration=ISO8601DurationToSeconds(elem.attrib["mediaPresentationDuration"])
			duration=roundUp(duration) ## "PT123.08S"=123.08 is roundup to 124 seconds
		if tag=="BaseURL":
			BaseURL=elem.text
		if tag=="SegmentTemplate":
			elemSeg = elem;
		if tag=="Representation":
			getSegmentURLs(files, duration, BaseURL, elemSeg, elem)
	
	## it's time to download all files (remove mpd from list)
	writeArrayToFile(files, options.output+"/manifest_segments.txt")
	del files[0]
	if options.download==1:
		downloadSegments(files, options.output)

	
def getSegmentURLs(files, duration, BaseURL, elemSeg, elem):
	url = elemSeg.attrib["initialization"] \
		.replace("$RepresentationID$", elem.attrib["id"])
	if not (url.startswith("http:") or url.startswith("https:") ):
		url = BaseURL + url
	files.append(url)

	mediaUrl = elemSeg.attrib["media"] \
		.replace("$RepresentationID$", elem.attrib["id"])
	if not (mediaUrl.startswith("http:") or mediaUrl.startswith("https:") ):
		mediaUrl = BaseURL + mediaUrl
		
	maxNum=roundUp( duration / (int(elemSeg.attrib["duration"]) / int(elemSeg.attrib["timescale"])) )
	for num in range( int(elemSeg.attrib["startNumber"]), maxNum+1):
		url = mediaUrl.replace("$Number$", str(num))
		files.append(url)
	return files

	
def downloadSegments(files, folder):
	## todo: this does not keep the original subfolders, all the files
	## are downloaded to the same output folder.
	for line in files:
		print(line)
		filename=line[line.rfind("/")+1:] ## ""http://some.com/sub/file.mp4" -> "file.mp4"
		response = urllib_request.urlopen(line)
		with open(folder+"/"+filename, "wb") as output:
			while True:
				chunk = response.read(16*1024)
				if not chunk: break
				output.write(chunk)

				
def writeArrayToFile(files, filename):
	with open(filename, 'w') as output:
		for line in files:
			output.write("%s\n" % line)

def roundUp(numval):
    return int(numval)+((int(numval)-numval)!=0)
	
def ISO8601DurationToSeconds(duration): 
	# convert "P1W2DT6H21M32S", "PT1381.080S" to (float)seconds
    week=day=hour=min=sec=0
    duration = duration.lower()
    value = ''
    for c in duration:
        if c.isdigit() or c=='.':
            value += c
            continue
        elif c == 'p':
            pass
        elif c == 't':
            pass
        elif c == 'w':
            week = int(value) * 604800
        elif c == 'd':
            day = int(value)  * 86400
        elif c == 'h':
            hour = int(value) * 3600
        elif c == 'm':
            min = int(value)  * 60
        elif c == 's':
            sec = float(value)
        value = ''
    return week + day + hour + min + sec
	
if __name__ == "__main__":
	main()
