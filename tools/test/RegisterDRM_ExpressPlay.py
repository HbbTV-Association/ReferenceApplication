#!/usr/bin/env python
## Register ExpressPlay DRM keys, parse LAURL array (test and production)
##  python.exe RegisterDRM_ExpressPlay.py --authprod="5050,5555" --authtest="4040,4444" > keys_expressplay.json
## Aki Nieminen/Sofia Digital
## 2017-08-21/Aki: initial release

import sys, os, time, datetime, json, urllib2
from optparse import OptionParser

def registerPlayready(drmType, auth, kid, enckey):
	url=""
	if (drmType==DRM_TYPE.TEST): 	url = "https://pr-gen.test.expressplay.com/hms/pr/token"
	elif (drmType==DRM_TYPE.PROD):	url = "https://pr-gen.service.expressplay.com/hms/pr/token"
	params = "customerAuthenticator=%s&kid=%s&contentKey=%s&expirationTime=%s&generalFlags=%s&rightsType=BuyToOwn&analogVideoOPL=100&compressedDigitalAudioOPL=100&compressedDigitalVideoOPL=100&uncompressedDigitalAudioOPL=100&uncompressedDigitalVideoOPL=100&minCertSecurityLevel=150&unknownOutputBehavior=Allow&errorFormat=json" % (
		auth, kid, enckey, 
		"%2B2592000", 	##expirationTime: 2592000=+30d,
		"00000000"		##flags: 00000000=non-persistent, 00000001=persistent
	)

	buf = urllib2.urlopen(url + "?" + params).read()
	obj = json.loads(buf)
	buf = obj["licenseAcquisitionUrl"] + "?ExpressPlayToken=" + obj["token"]
	##buf = buf.encode("latin-1")	
	if buf.startswith("http:"): buf = "https:"+buf[5:]
	return buf

def registerWidevine(drmType, auth, kid, enckey):
	url=""
	if (drmType==DRM_TYPE.TEST):	url = "https://wv-gen.test.expressplay.com/hms/wv/token"
	elif (drmType==DRM_TYPE.PROD):	url = "https://wv-gen.service.expressplay.com/hms/wv/token"
	params="customerAuthenticator=%s&kid=%s&contentKey=%s&expirationTime=%s&generalFlags=%s&securityLevel=1&hdcpOutputControl=0&trackType=1&errorFormat=json" % (
		auth, kid, enckey,
		"%2B2592000", 	##expirationTime: 2592000=+30d,
		"00000000"		##flags: 00000000=non-persistent, 00000001=persistent
	)
	##contentId=max 36 bytes
	##trackType=0..4 (0=SD,1*=HD,2=AUDIO,3=UHD1,4=UHD2)
	##securityLevel=1..5 (1*=SW_CRYPTO,2=SW_DECODE,3=HW_CRYPTO,4=HW_DECODE,5=HW_ALL)
	##hdcpOutputControl=0..5 (0*=NONE,1=V1,2=V2,3=V2.1,4=V2.2,5=HDCPNODIGITALOUT)
	##licenseDuration=default infinite or seconds to start first playback
	##playbackDuration=default infinite or seconds viewing duration			
	buf=urllib2.urlopen(url + "?" + params).read()
	return buf

def registerMarlinMS3(drmType, auth, kid, enckey):
	url=""
	if (drmType==DRM_TYPE.TEST):	url = "https://ms3-gen.test.expressplay.com/hms/ms3/token"
	elif (drmType==DRM_TYPE.PROD):	url = "https://ms3-gen.service.expressplay.com/hms/ms3/token"
	params="customerAuthenticator=%s&contentId=urn:marlin:kid:%s&contentKey=%s&outputControlOverride=urn:marlin:organization:intertrust:wudo,ImageConstraintLevel,0&expirationTime=%s&extensionType=%s&errorFormat=json&contentURL=%s" % (
		auth, kid, enckey,
		"%2B2592000", 	##expirationTime: 2592000=+30d,
		"wudo&extensionCriticalFlag=false&extensionPayload=AAAAAA==",  ## extension to lift 520k resolution limit
		"http://myserver.com/myvideo/drm/manifest.mpd"  ## this is replaced by player at runtime
	)
	buf=urllib2.urlopen(url + "?" + params).read()
	return buf
	
def register(drmType, auth, kid, enckey):
	obj={}
	obj["kid"]=kid		
	obj["key"]=enckey	## real production system should keep KEY value secret !!
	obj["playready"]=registerPlayready(drmType, auth, kid, enckey)
	obj["widevine"]=registerWidevine(drmType, auth, kid, enckey)
	obj["marlinms3"]=registerMarlinMS3(drmType, auth, kid, enckey)
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
	parser.add_option("--authprod", type="string", dest="authprod", help="Authentication key for production service")
	parser.add_option("--authtest", type="string", dest="authtest", help="Authentication key for test service")
	(options, args) = parser.parse_args()

	## Register KID and ENCKEY values to license service
	now = datetime.datetime.utcnow()
	obj={}
	obj["created"]=now.strftime('%Y-%m-%dT%H:%M:%SZ')	
	obj["Test1234"]=register(DRM_TYPE.TEST, options.authtest, "43215678123412341234123412341234", "12341234123412341234123412341234")
	obj["Test1235"]=register(DRM_TYPE.TEST, options.authtest, "43215678123412341234123412341235", "12341234123412341234123412341235")
	obj["Test1236"]=register(DRM_TYPE.TEST, options.authtest, "43215678123412341234123412341236", "12341234123412341234123412341236")
	obj["Test1237"]=register(DRM_TYPE.TEST, options.authtest, "43215678123412341234123412341237", "12341234123412341234123412341237")
	obj["Test1238"]=register(DRM_TYPE.TEST, options.authtest, "43215678123412341234123412341238", "12341234123412341234123412341238")

	obj["Prod1234"]=register(DRM_TYPE.PROD, options.authprod, "43215678123412341234123412341234", "12341234123412341234123412341234")
	obj["Prod1235"]=register(DRM_TYPE.PROD, options.authprod, "43215678123412341234123412341235", "12341234123412341234123412341235")
	obj["Prod1236"]=register(DRM_TYPE.PROD, options.authprod, "43215678123412341234123412341236", "12341234123412341234123412341236")
	obj["Prod1237"]=register(DRM_TYPE.PROD, options.authprod, "43215678123412341234123412341237", "12341234123412341234123412341237")
	obj["Prod1238"]=register(DRM_TYPE.PROD, options.authprod, "43215678123412341234123412341238", "12341234123412341234123412341238")
	obj = json.dumps(obj, indent=2, sort_keys=True, ensure_ascii=False)
	print obj

if __name__ == "__main__":
	main()
