#!/usr/bin/env python
## Create Microsoft Test Server DRM keys, parse LAURL array
##  python.exe RegisterDRM_MicrosoftTest.py > keys_microsofttest.json
## Aki Nieminen/Sofia Digital
## 2019-05-27/Aki: removed firstexp attribute from laurl(older TVs without time-policies may fail)
## 2017-11-30/Aki: changed hexdecode to python3
## 2017-08-21/Aki: initial release

import sys, os, time, datetime, json, base64
from optparse import OptionParser

def registerPlayready(drmType, auth, kid, enckey):
	now = datetime.datetime.utcnow() + datetime.timedelta(minutes=120)
	url="https://test.playready.microsoft.com/service/rightsmanager.asmx"
	params = "cfg=(kid:header,sl:2000,persist:false,contentkey:%s)" % (
		base64.b64encode(bytearray.fromhex(enckey)).decode("ISO-8859-1")
	)
	#params = "cfg=(kid:header,sl:2000,persist:false,firstexp:%s,contentkey:%s)" % (
	#	60*1,  ##expiration(seconds) on first play
	#	##now.strftime('%Y%m%d%H%M%S'), ##expiration:20170921000000
	#	#base64.b64encode(enckey.decode('hex'))
	#	base64.b64encode(bytearray.fromhex(enckey)).decode("ISO-8859-1")
	#)
	return url + "?" + params
	
def register(drmType, auth, kid, enckey):
	if kid.startswith("0x"): kid = kid[2:]
	if enckey.startswith("0x"): enckey = enckey[2:]
	obj={}
	obj["kid"]=kid		
	obj["key"]=enckey	## real production system should keep KEY value secret !!
	obj["playready"]=registerPlayready(drmType, auth, kid, enckey)
	obj["b64kid"]=base64.b64encode(bytearray.fromhex(kid)).decode("ISO-8859-1")
	obj["b64key"]=base64.b64encode(bytearray.fromhex(enckey)).decode("ISO-8859-1")
	return obj;

##############################
##############################
class DRM_TYPE: ## enum
	TEST=0
	PROD=1

def main():
	## parse command line arguments
	parser = OptionParser(add_help_option=False)
	parser.add_option("-h", "--help", action="help")
	parser.add_option("--authtest", type="string", dest="authtest", help="Authentication key for test service (not used)")
	(options, args) = parser.parse_args()

	## Register KID and ENCKEY values to license service
	now = datetime.datetime.utcnow()
	obj={}
	obj["created"]=now.strftime('%Y-%m-%dT%H:%M:%SZ')	
	obj["Test1234"]=register(DRM_TYPE.TEST, options.authtest, "0x43215678123412341234123412341234", "0x12341234123412341234123412341234")
	obj["Test1235"]=register(DRM_TYPE.TEST, options.authtest, "43215678123412341234123412341235", "12341234123412341234123412341235")
	obj["Test1236"]=register(DRM_TYPE.TEST, options.authtest, "43215678123412341234123412341236", "12341234123412341234123412341236")
	obj["Test1237"]=register(DRM_TYPE.TEST, options.authtest, "43215678123412341234123412341237", "12341234123412341234123412341237")
	obj["Test1238"]=register(DRM_TYPE.TEST, options.authtest, "43215678123412341234123412341238", "12341234123412341234123412341238")
	obj["Test1239"]=register(DRM_TYPE.TEST, options.authtest, "43215678123412341234123412341239", "12341234123412341234123412341239")

	obj["Test148D"]=register(DRM_TYPE.TEST, options.authtest, "5A461E692ABF5534A30FFC45BFD7148D", "307F7B3F5579BEF53894A6D946762267")

	obj = json.dumps(obj, indent=2, sort_keys=True, ensure_ascii=False)
	print (obj)

if __name__ == "__main__":
	main()
