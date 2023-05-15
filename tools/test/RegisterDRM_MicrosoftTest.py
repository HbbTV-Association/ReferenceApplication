#!/usr/bin/env python
## Create Microsoft Test Server DRM keys, parse LAURL array
##  python.exe RegisterDRM_MicrosoftTest.py > keys_microsofttest.json
## Aki Nieminen/Sofia Digital
## 2023-05-10/Aki: added algid(CENC,CBCS), multikey laurl
## 2019-05-27/Aki: removed firstexp attribute from laurl(older TVs without time-policies may fail)
## 2017-11-30/Aki: changed hexdecode to python3
## 2017-08-21/Aki: initial release

import sys, os, time, datetime, json, base64
from optparse import OptionParser

def registerPlayready(drmType, auth, kid, enckey, algId, secLevel):
	url="https://test.playready.microsoft.com/service/rightsmanager.asmx"
	params = "cfg=(kid:header,sl:%s,persist:false,contentkey:%s%s)" % (
		secLevel,
		base64.b64encode(bytearray.fromhex(enckey)).decode("ISO-8859-1"),
		",ckt:aescbc" if algId=="CBCS" else ""
	)
	#now = datetime.datetime.utcnow() + datetime.timedelta(minutes=120)	
	#params = "cfg=(kid:header,sl:2000,persist:false,firstexp:%s,contentkey:%s)" % (
	#	60*1,  ##expiration(seconds) on first play
	#	##now.strftime('%Y%m%d%H%M%S'), ##expiration:20170921000000
	#	#base64.b64encode(enckey.decode('hex'))
	#	base64.b64encode(bytearray.fromhex(enckey)).decode("ISO-8859-1")
	#)
	return url + "?" + params

def registerPlayreadyMultiKey(drmType, auth, keys, algId):
	#cfg=(kid:43215678-1234-1234-1234-123412341237,sl:3000,persist:false,contentkey:EjQSNBI0EjQSNBI0EjQSNw==),(kid:43215678-1234-1234-1234-123412341236,sl:2000,persist:false,contentkey:EjQSNBI0EjQSNBI0EjQSNg==)
	url="https://test.playready.microsoft.com/service/rightsmanager.asmx"
	params="cfg="
	for idx,key in enumerate(keys,start=0):
		kidGuid = key[0][0:8]+"-"+key[0][8:12]+"-"+key[0][12:16]+"-"+key[0][16:20]+"-"+key[0][20:]
		if len(params)>5: params +=","
		params += "(kid:%s,sl:%s,persist:false,contentkey:%s%s)" % (
			kidGuid,
			key[2], ## 2000,3000
			base64.b64encode(bytearray.fromhex(key[1])).decode("ISO-8859-1"),
			",ckt:aescbc" if algId=="CBCS" else ""
		)
	return url + "?" + params
	
def register(drmType, auth, kid, enckey, algId="CENC",secLevel="2000"):
	if kid.startswith("0x"): kid = kid[2:]
	if enckey.startswith("0x"): enckey = enckey[2:]
	obj={}
	obj["kid.0"]=kid		
	obj["key.0"]=enckey	## real production system should keep KEY value secret !!
	obj["sl.0"]    = secLevel
	obj["b64kid.0"]=base64.b64encode(bytearray.fromhex(kid)).decode("ISO-8859-1")
	obj["b64key.0"]=base64.b64encode(bytearray.fromhex(enckey)).decode("ISO-8859-1")
	obj["algid"]   = algId  ## CENC,CBCS
	obj["playready"]=registerPlayready(drmType, auth, kid, enckey, algId, secLevel)
	return obj;
	
def registerMultiKey(drmType, auth, keys, algId="CENC"):
	## trim leading "0x" hex marker, trim "-" from KeyID
	for idx,key in enumerate(keys,start=0):
		if key[0].startswith("0x"): key[0] = key[0][2:] ## [0]=KeyID
		key[0] = key[0].replace("-","")
		if key[1].startswith("0x"): key[1] = key[1][2:] ## [1]=EncKEY

	obj={}
	for idx,key in enumerate(keys,start=0):
		obj["kid."+str(idx)]=key[0] ## KeyID
		obj["key."+str(idx)]=key[1] ## EncKEY
		obj["sl."+str(idx)] =key[2] ## SecurityLevel 2000,3000
		obj["b64kid."+str(idx)]=base64.b64encode(bytearray.fromhex(key[0])).decode("ISO-8859-1")
		obj["b64key."+str(idx)]=base64.b64encode(bytearray.fromhex(key[1])).decode("ISO-8859-1")
	obj["algid"]         = algId  ## CENC,CBCS
	obj["playready"]     = registerPlayreadyMultiKey(drmType, auth, keys, algId)
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

	obj["Test1236_CBCS"]=register(DRM_TYPE.TEST, options.authtest, "43215678123412341234123412341236", "12341234123412341234123412341236", "CBCS")
	obj["Test1237_CBCS"]=register(DRM_TYPE.TEST, options.authtest, "43215678123412341234123412341237", "12341234123412341234123412341237", "CBCS")

	obj["Test12371236"]=registerMultiKey(DRM_TYPE.TEST, options.authtest, 
		[
			[ obj["Test1237"]["kid.0"], obj["Test1237"]["key.0"], "3000" ],
			[ obj["Test1236"]["kid.0"], obj["Test1236"]["key.0"], "2000" ]
		],
		"CENC"
	)
	obj["Test12371236_7"]=registerMultiKey(DRM_TYPE.TEST, options.authtest, 
		[
			[ obj["Test1237"]["kid.0"], obj["Test1237"]["key.0"], "2000" ],
			[ obj["Test1236"]["kid.0"], obj["Test1236"]["key.0"], "2000" ]
		],
		"CENC"
	)

	obj = json.dumps(obj, indent=2, sort_keys=False, ensure_ascii=False)
	print (obj)

if __name__ == "__main__":
	main()
