#!/usr/bin/env python
## Modify refapp config.json file (laurl)
## - modifies "la_url_id":"${ep_Prod1234}" field to "la_url" field
##
## python3 ModifyConfig.py --source="git/src/catalogue/config.json" --laurl_ep="/srv/www/videos/keys_expressplay.json" --output="/srv/www/prod/catalogue/config.json"
## python3 ModifyConfig.py --source="git/src/catalogue/config.json" --laurl_ep="/srv/www/videos/keys_expressplay.json"

import sys, os, io, codecs, subprocess, shutil, zipfile, time, datetime, json, socket, platform
import calendar, unicodedata
from optparse import OptionParser
import urllib.request as urllib_request
import urllib.error as urllib_error
from urllib.parse import urlparse, parse_qs, urlencode, quote_plus

##########################################

BASEDIR     = os.path.dirname(os.path.realpath(__file__)) ## script folder "/opt/my/sub"

##########################################

def loadJsonFile(file):
	obj=None
	if file!="": 
		fFile = codecs.open(file,'r',encoding='utf-8')
		obj = json.loads(fFile.read())
		fFile.close()
	return obj

def main():
	## parse command line arguments
	parser = OptionParser(add_help_option=False)
	parser.add_option("-h", "--help", action="help")
	parser.add_option("--source",  type="string", dest="source", help="Source input file")
	parser.add_option("--output",  type="string", dest="output", default="", help="Output file or empty to SYSOUT")
	parser.add_option("--laurl_ms", type="string", dest="laurl_ms", default="", help="microsoft LAURL input file, ${ms_Test1234}")
	parser.add_option("--laurl_ep", type="string", dest="laurl_ep", default="", help="expressplay LAURL input file, ${ep_Prod1234}")
	parser.add_option("--laurl_ck", type="string", dest="laurl_ck", default="", help="clearkey LAURL input file, ${ck_Test1234}")
	#parser.add_option("--laurl_wv", type="string", dest="laurl_wv", default="", help="widevine LAURL input file, ${wv_Test1234}")
	(options, args) = parser.parse_args()
	#for opt in {"f1","f2","f3"}:
	#	if options.__dict__[opt] is None: parser.error("parameter %s is missing"%opt)	
	#for opt in {"f4"}:
	#	if options.__dict__[opt] is None: options.__dict__[opt]="" ## Cast none to empty string

	obj    = loadJsonFile(options.source)
	obj_ms = loadJsonFile(options.laurl_ms)  ## Microsoft test (playready)
	obj_ep = loadJsonFile(options.laurl_ep)  ## ExpressPlay (playready,marlin,widevine)
	obj_ck = loadJsonFile(options.laurl_ck)  ## Sofia ClearKey (clearkey)
	#obj_wv = loadJsonFile(options.laurl_wv) ## xxTodoxx Widevine (widevine)
	
	## loop items and modify "${ms_Test1234}", "${ep_Prod1234}",  "${ck_Prod1234}" placeholders
	FIELD_LAURL_ID = "la_url_id"
	FIELD_LAURL = "la_url"
	for menuItem in obj["menus"]:
		if not "items" in menuItem: continue
		for item in menuItem["items"]:
			if not FIELD_LAURL_ID in item: continue
			value = item[FIELD_LAURL_ID]
			
			objLaurl=None
			if value.startswith("${ms_"):
				objLaurl = obj_ms
			elif value.startswith("${ep_"):
				objLaurl = obj_ep
			elif value.startswith("${ck_"):
				objLaurl = obj_ck
			#elif value.startswith("${wv_"):
			#	objLaurl = obj_wv
				
			if objLaurl==None: continue			

			drm = item["drm"] ## playready,widevine,marlin,clearkey
			if drm.startswith("playready"):  drm="playready" ## "playready.recommendation" -> "playready"
			elif drm.startswith("marlin"):   drm="marlinms3"
			elif drm.startswith("clearkey"): drm="clearkey"
			elif drm.startswith("widevine"): drm="widevine"
			elif drm=="": continue ## skip, laurl is baked in manifest or init.mp4 file
			else:
				raise ValueError( "Not implemented drm=%s" % (drm) )
			
			## use "${ms_Test1234}" -> "Test1234" lookup key
			key = value[value.find("_")+1 : len(value)-1 ]
			if not key in objLaurl: raise ValueError( "Not found drm=%s, key=%s, value=%s" % (drm,key,value) )
			
			if options.output!="":
				print("%s, %s, laurl=%s" % (item["title"], drm, value))
			
			if drm=="marlinms3":
				## create MS3 url
				## ms3://ms3.service.expressplay.com:8443/hms/ms3/rights/?b=AD..a3v#https%3A%2F%2Frefapp.hbbtv.org%2Fvideos%2F02_gran_dillama_1080p_25f75g6sv4%2Fdrm%2Fmanifest.mpd			
				value = objLaurl[key][drm]
				delim = value.rfind("#")
				if delim>0: value = value[0:delim]
				item[FIELD_LAURL] = value  #item["url"] = value + "#" + quote_plus(item["url"])
				#if FIELD_LAURL in item: del item[FIELD_LAURL]
			else:
				## replace value in json object
				item[FIELD_LAURL] = objLaurl[key][drm]
				
		#endOfFor
	#endOfFor
	
	## write output to a file or sysout
	if options.output!="":
		fFile = codecs.open(options.output,"w","utf-8")
		fFile.write( json.dumps(obj, indent=2, sort_keys=False, ensure_ascii=False) )
		fFile.close()
	else:
		print( json.dumps(obj, indent=2, sort_keys=False, ensure_ascii=False) )


#################################
if __name__ == "__main__":
	main()
