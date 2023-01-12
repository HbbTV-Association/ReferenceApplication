#!/usr/bin/env python
## Register ExpressPlay DRM keys, parse LAURL array (test and production)
##  python.exe RegisterDRM_ExpressPlay.py --authprod="5050,5555" --authtest="4040,4444" > keys_expressplay.json
## Aki Nieminen/Sofia Digital
## 2022-12-20/Aki: changed securitylevel 150 to 2000
## 2022-10-06/Aki: added algid(CENC,CBCS) param
## 2019-05-25/Aki: added kid+key arguments
## 2017-11-30/Aki: changed urllib2(Python2) to urllib(Python3)
## 2017-08-21/Aki: initial release

import sys, os, time, datetime, json, base64, urllib.request, urllib.parse 
from optparse import OptionParser

DEBUG = False

def registerPlayready(drmType, auth, keys, persistent, contentId, algId):
	url=""
	if (drmType==DRM_TYPE.TEST): 	url = "https://pr-gen.test.expressplay.com/hms/pr/token"
	elif (drmType==DRM_TYPE.PROD):	url = "https://pr-gen.service.expressplay.com/hms/pr/token"
	
	params = { 
		"customerAuthenticator" : auth
		,"expirationTime" : "+2592000"	## 2592000=+30d
		,"generalFlags"   : "00000000" if persistent==0 else "00000001" ##flags: 00000000=non-persistent, 00000001=persistent	
		,"useHttps"       : "true"
		,"errorFormat"    : "json"		
		,"rightsType"     : "BuyToOwn"
		,"unknownOutputBehavior"      : "Allow"		
		,"analogVideoOPL"             : "100" ## or could use .0/.1 for tracks
		,"compressedDigitalAudioOPL"  : "100"
		,"compressedDigitalVideoOPL"  : "100"
		,"uncompressedDigitalAudioOPL": "100"
		,"uncompressedDigitalVideoOPL": "100"
	}
	
	if algId=="CBCS": params["algId"] = "aescbc"; ## aesctr, aescbc

	## SecurityLevel: 3000,2000,150  best to worst, widevine 5..1 level to playready
	for idx,key in enumerate(keys,start=0):
		secLevel=""
		if   key[2]=="5" or key[2]=="4" : secLevel="3000"
		elif key[2]=="3" or key[2]=="2" : secLevel="2000"
		elif key[2].startswith("3000")  : secLevel="3000" ## fixme: split playready,widevine levels "3000,5","3000,4",..
		elif key[2].startswith("2000")  : secLevel="2000"
		elif key[2]=="1"                : secLevel="150"
		else                            : secLevel=key[2] ## use as-is	
		params["kid."+str(idx)] = key[0]	
		params["contentKey."+str(idx)] = key[1]
		params["minCertSecurityLevel."+str(idx)] = secLevel
	
	url = url+"?"+urllib.parse.urlencode(params)
	if (DEBUG): return url
	buf = urllib.request.urlopen(url).read()
	obj = json.loads(buf)
	buf = obj["licenseAcquisitionUrl"] + "?ExpressPlayToken=" + obj["token"]
	
	##CBCS must use pr2 hostname
	if algId=="CBCS":
		buf = buf.replace("https://pr.service.expressplay.com","https://pr2.service.expressplay.com")
	
	##buf = buf.encode("latin-1")	
	#if buf.startswith("http:"): buf = "https:"+buf[5:]
	return buf

def registerWidevine(drmType, auth, keys, persistent, contentId):
	url=""
	if (drmType==DRM_TYPE.TEST):	url = "https://wv-gen.test.expressplay.com/hms/wv/token"
	elif (drmType==DRM_TYPE.PROD):	url = "https://wv-gen.service.expressplay.com/hms/wv/token"

	params = {
		"customerAuthenticator" : auth
		,"expirationTime" : "+2592000"	## 2592000=+30d
		,"generalFlags"   : "00000000" if persistent==0 else "00000001" ##flags: 00000000=non-persistent, 00000001=persistent	
		,"useHttps"       : "true"
		,"errorFormat"    : "json"
	}
	
	if contentId!="": params["contentId"] = contentId ##max of 36 chars, such as "code1234"
	##licenseDuration=default infinite or seconds to start first playback
	##playbackDuration=default infinite or seconds viewing duration
	
	## SecurityLevel: 5..1  best to worst, change playready to widevine levels
	for idx,key in enumerate(keys,start=0):
		secLevel=""
		if   key[2]=="3000"  : secLevel="5"
		elif key[2]=="3000,5": secLevel="5"
		elif key[2]=="3000,4": secLevel="4"
		elif key[2]=="3000,3": secLevel="3"
		elif key[2]=="2000"  : secLevel="2"
		elif key[2]=="2000,2": secLevel="2"
		elif key[2]=="2000,1": secLevel="1" ## fixme split to array if Playrady,Widevine levels in a seclevel value
		elif key[2]=="150"   : secLevel="1"
		else                 : secLevel=key[2] ## use as-is, must be 5..1 number
		params["kid."+str(idx)] = key[0]	
		params["contentKey."+str(idx)] = key[1]
		params["hdcpOutputControl."+str(idx)] = "0"  ## 0=HDCP_NONE, 1=HDCP_V1, 2=HDCP_V2, 3=HDCP_V2_1, 4=HDCP_V2_2, 5=HDCP_NO_DIGITAL_OUTPUT
		params["trackType."+str(idx)] = "1"          ## 0=SD, 1=HD, 2=AUDIO, 3=UHD1, 4=UHD2
		params["securityLevel."+str(idx)] = secLevel ## 1=SW_CRYPTO(SL3),2=SW_DECODE(SL3),3=HW_CRYPTO(SL2),4=HW_DECODE(SL1),5=HW_ALL(SL1)
	
	url = url+"?"+urllib.parse.urlencode(params)
	if (DEBUG): return url
	buf = urllib.request.urlopen(url).read().decode("ISO-8859-1")
	return buf

def registerMarlinMS3(drmType, auth, keys, persistent, contentId):
	## bb-gen-2.test.expressplay.com, ms3-gen-2.test.expressplay.com
	url=""
	#if (drmType==DRM_TYPE.TEST):	url = "https://ms3-gen.test.expressplay.com/hms/ms3/token"
	if (drmType==DRM_TYPE.TEST):	url = "https://ms3-gen-2.test.expressplay.com/hms/ms3/token"
	elif (drmType==DRM_TYPE.PROD):	url = "https://ms3-gen.service.expressplay.com/hms/ms3/token"
	
	params = {
		"customerAuthenticator" : auth
		,"expirationTime" : "+2592000"	## 2592000=+30d
		,"useHttps"       : "true"
		,"errorFormat"    : "json"
		,"outputControlOverride" : "urn:marlin:organization:intertrust:wudo,ImageConstraintLevel,0"
		,"extensionType"  : "wudo"
		,"extensionCriticalFlag": "false"
		,"extensionPayload" : "AAAAAA=="
		,"contentURL"     : "http://myserver.com/myvideo/drm/manifest.mpd"  ## this is replaced by player at runtime
	}
	
	for idx,key in enumerate(keys,start=0):
		params["contentId."+str(idx)] = "urn:marlin:kid:"+key[0]	## KeyID
		params["contentKey."+str(idx)] = key[1] ## EncKEY
	
	url = url+"?"+urllib.parse.urlencode(params)
	if (DEBUG): return url
	buf = urllib.request.urlopen(url).read().decode("ISO-8859-1")
	return buf
	
def register(drmType, auth, keys, persistent, contentId, algId):
	## trim leading "0x" hex marker, trim "-" from KeyID
	for idx,key in enumerate(keys,start=0):
		if key[0].startswith("0x"): key[0] = key[0][2:] ## [0]=KeyID
		key[0] = key[0].replace("-","")
		if key[1].startswith("0x"): key[1] = key[1][2:] ## [1]=EncKEY

	## LaUrl: single key(one item in an array) or multi key (1..n items in an array)
	## multikey is used for Video=SL3000,Audio=SL2000 content.
	obj={}
	for idx,key in enumerate(keys,start=0):
		obj["kid."+str(idx)]=key[0] ## KeyID
		obj["key."+str(idx)]=key[1] ## EncKEY
		obj["sl."+str(idx)] =key[2] ## SecurityLevel playready,widevine "2000,2", "2000,1"
		obj["b64kid."+str(idx)]=base64.b64encode(bytearray.fromhex(key[0])).decode("ISO-8859-1")
		obj["b64key."+str(idx)]=base64.b64encode(bytearray.fromhex(key[1])).decode("ISO-8859-1")
	## few obj values are global per key list
	obj["contentid"]     = contentId
	obj["key_persistent"]= persistent
	obj["algid"]         = algId  ## CENC,CBCS
	obj["playready"]     = registerPlayready(drmType, auth, keys, persistent, contentId, algId)
	obj["widevine"]      = registerWidevine(drmType, auth, keys, persistent, contentId)
	obj["marlinms3"]     = registerMarlinMS3(drmType, auth, keys, persistent, contentId)
	return obj;

##############################
##############################
class DRM_TYPE: ## enum
	TEST=0
	PROD=1
	
#################################
#################################

def main():
	## parse command line arguments
	parser = OptionParser(add_help_option=False)
	parser.add_option("-h", "--help", action="help")
	parser.add_option("--authprod", type="string", dest="authprod", default="", help="Authentication key for production service")
	parser.add_option("--authtest", type="string", dest="authtest", default="", help="Authentication key for test service")
	parser.add_option("--kid", type="string", dest="kid", default="", help="Optional KID hex string") ## legacy param, use kid.0
	parser.add_option("--key", type="string", dest="key", default="", help="Optional KEY hex string")
	parser.add_option("--kid.0", type="string", dest="kid0", default="", help="Optional KID hex string for video")
	parser.add_option("--key.0", type="string", dest="key0", default="", help="Optional KEY hex string for video")
	parser.add_option("--sl.0", type="string", dest="sl0", default="150", help="Security level 3000,2000,150 (best to worst)")
	parser.add_option("--kid.1", type="string", dest="kid1", default="", help="Optional KID hex string for audio")
	parser.add_option("--key.1", type="string", dest="key1", default="", help="Optional KEY hex string for audio")
	parser.add_option("--sl.1", type="string", dest="sl1", default="150", help="Security level 3000,2000,150 (best to worst)")
	parser.add_option("--contentid", type="string", dest="contentid", default="", help="Content id (Widevine)")
	parser.add_option("--persistent", type="int", dest="persistent", default="0", help="Use persistent license (1,0)")
	parser.add_option("--algid", type="string", dest="algid", default="CENC", help="Algorithm CENC, CBCS")
	
	(options, args) = parser.parse_args()

	## Register KID and ENCKEY values to license service
	now = datetime.datetime.utcnow()

	if options.kid!="":
		options.kid0=options.kid
		options.key0=options.key
		options.kid1 = options.key1 = ""

	## if no KIDs then use a hardcoded KID-KEY test values
	emptyKid = options.kid0=="" and options.kid1==""
	
	multiKeys = [] ## array of [ ArrayOfKeys ]
	multiKeysCBCS = []
	if not emptyKid:
		## user-provided KID-KEY
		tempKeys=[]
		if options.kid0!="": tempKeys.append( [ options.kid0, options.key0, options.sl0 ] )
		if options.kid1!="": tempKeys.append( [ options.kid1, options.key1, options.sl1 ] )
		if options.algid=="CBCS":	
			multiKeysCBCS.append( tempKeys )
		else:
			multiKeys.append( tempKeys )
	else:
		## hardcoded test KEYID-ENCKEY pairs
		options.contentid="" ## use empty to have an autogenerated contentId for each LaUrl
		multiKeys.append([[ "0x43215678123412341234123412341234", "0x12341234123412341234123412341234", "2000,1" ]])
		multiKeys.append([[ "43215678123412341234123412341235", "12341234123412341234123412341235", "2000,1" ]])
		multiKeys.append([[ "43215678123412341234123412341236", "12341234123412341234123412341236", "2000,1" ]])
		multiKeys.append([[ "43215678123412341234123412341237", "12341234123412341234123412341237", "2000,1" ]])
		multiKeys.append([[ "43215678123412341234123412341238", "12341234123412341234123412341238", "2000,1" ]])
		multiKeys.append([[ "43215678123412341234123412341239", "12341234123412341234123412341239", "2000,1" ]])
		## multikey LaUrl for SL3000+SL2000 test
		multiKeys.append([
			[ "43215678123412341234123412341237", "12341234123412341234123412341237", "3000,5" ],
			[ "43215678123412341234123412341236", "12341234123412341234123412341236", "2000,1" ]
		])
		multiKeys.append([
			[ "43215678123412341234123412341237", "12341234123412341234123412341237", "2000,2" ],
			[ "43215678123412341234123412341236", "12341234123412341234123412341236", "2000,1" ]
		])

		## CBCS test keys, use "2001,1" instead of "150"
		multiKeysCBCS.append([[ "43215678123412341234123412341236", "12341234123412341234123412341236", "2000,1" ]])
		multiKeysCBCS.append([[ "43215678123412341234123412341237", "12341234123412341234123412341237", "2000,1" ]])
		multiKeysCBCS.append([
			[ "43215678123412341234123412341237", "12341234123412341234123412341237", "3000,5" ],
			[ "43215678123412341234123412341236", "12341234123412341234123412341236", "2000,1" ]
		])
		multiKeysCBCS.append([
			[ "43215678123412341234123412341237", "12341234123412341234123412341237", "2000,2" ],
			[ "43215678123412341234123412341236", "12341234123412341234123412341236", "2000,1" ]
		])		

	objProd = {}
	objTest = {}
	for idx,item in enumerate(multiKeys,start=0):
		## concatenate last 4 chars from kid "Test1234", "Test12371236"
		## or use a user-provided contentId
		contentId=options.contentid
		if contentId=="":
			for idxB,key in enumerate(item,start=0):
				contentId += key[0][-4:]

		if options.authprod:
			objKey   ="Prod"+contentId if options.contentid=="" else "ProdKID"
			objContId="Test"+contentId if options.contentid=="" else contentId ## always use "Test1234" contentId
			if objKey in objProd: objKey+="_"+str(idx)
			objProd[objKey] = register(DRM_TYPE.PROD, options.authprod, item, options.persistent, objContId, "CENC")

		if options.authtest:
			objKey   ="Test"+contentId if options.contentid=="" else "TestKID"
			objContId="Test"+contentId if options.contentid=="" else contentId
			if objKey in objTest: objKey+="_"+str(idx)
			objTest[objKey] = register(DRM_TYPE.TEST, options.authtest, item, options.persistent, objContId, "CENC")

	for idx,item in enumerate(multiKeysCBCS,start=0):
		## concatenate last 4 chars from kid "Test1234", "Test12371236"
		## or use a user-provided contentId
		contentId=options.contentid
		if contentId=="":
			for idxB,key in enumerate(item,start=0):
				contentId += key[0][-4:]

		if options.authprod:
			objKey   ="Prod"+contentId+"_CBCS" if options.contentid=="" else "ProdKID"
			objContId="Test"+contentId if options.contentid=="" else contentId ## always use "Test1234" contentId
			if objKey in objProd: objKey+="_"+str(idx)
			objProd[objKey] = register(DRM_TYPE.PROD, options.authprod, item, options.persistent, objContId, "CBCS")

	obj={}
	obj.update(objProd)
	obj.update(objTest)
	obj["created"]=now.strftime('%Y-%m-%dT%H:%M:%SZ')
	
	obj = json.dumps(obj, indent=2, sort_keys=False, ensure_ascii=False)
	print (obj)

if __name__ == "__main__":
	main()
