#!/usr/bin/env python
## Register Irdeto DRM keys
##  python3.exe RegisterDRM_Irdeto.py --account="xx" --username="myuser" --password="mypwd" > keys_irdeto.json
## Aki Nieminen/Sofia Digital
## 2020-10-26/Aki: initial release

import sys, os, time, datetime, json, base64, urllib.request, urllib.parse
from optparse import OptionParser

####################################

PREFIX     = "Refapp"  ## Link content to Irdeto "Refapp-bundle", "Refapp-policy" objects
ACCOUNT    = "" ## Irdeto account id (visible in LaUrl)
SERVICE_URL= "https://${account}.test.ott.irdeto.com"

####################################

## Login to service, read access token
def createToken(username, password):
	url = SERVICE_URL+"/idp/token"
	params = { "grant_type":"client_credentials", "client_id":username, "client_secret":password }

	buf = urllib.parse.urlencode(params, encoding="UTF-8", errors="strict") ## convert to "key1=val&key2=val2" string
	req = urllib.request.Request(url, data=buf.encode(encoding="UTF-8",errors="strict"), method="POST")
	req.add_header("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8")
	buf = urllib.request.urlopen(req).read()

	#print(buf)
	obj = json.loads(buf)
	return obj["access_token"]

## Register Content object, later KID+ENCKEY are inserted inside this object.
def registerContent(token, contentId):
	url = "%s/ls/v1/%s/contents/%s" % (SERVICE_URL, ACCOUNT, contentId)
	params = {
		"id":contentId, "displayName":contentId,
		"linear":False,
		"bundles":{"items":[ {"id":PREFIX+"-bundle"} ]},
		"contentPolicy":{"id":PREFIX+"-policy"}
	}

	req = urllib.request.Request(url, json.dumps(params).encode(encoding="UTF-8",errors="strict"), method="PUT")
	req.add_header("Content-Type", "application/json; charset=UTF-8")
	req.add_header("Authorization", "Bearer "+token)
	buf = urllib.request.urlopen(req).read()

	#print(buf)
	obj = json.loads(buf)
	return obj["id"]
	
## Register KID+ENCRYPTIONKEY inside a content object
def registerContentKey(token, contentId, kid, key):
	url = "%s/ls/v1/%s/contents/%s/contentKeys" % (SERVICE_URL, ACCOUNT, contentId)
	params = {
		"id":kid,	## KID_Guid
		"keyData":key   ## KEY_Base64
		,"trackTypes":["default"] ## ["default","sd","hd","uhd","audio"]
	}

	req = urllib.request.Request(url, json.dumps(params).encode(encoding="UTF-8",errors="strict"), method="POST")
	req.add_header("Content-Type", "application/json; charset=UTF-8")
	req.add_header("Authorization", "Bearer "+token)
	buf = urllib.request.urlopen(req).read()

	#print(buf)
	obj = json.loads(buf)
	return obj["id"]

def register(token, contentid, kid, enckey):
	kidGuid=""
	if kid.startswith("0x"): kid = kid[2:]
	if(kid.find("-")<0):
		kidGuid = "%s-%s-%s-%s-%s" % (kid[0:8], kid[8:12], kid[12:16], kid[16:20], kid[20:] )
	else:
		kidGuid = kid
		kid = kid.replace("-","")
		
	if enckey.startswith("0x"): enckey = enckey[2:]
	
	obj={}
	obj["kid"]    =kid
	obj["kidGuid"]=kidGuid
	obj["key"]    =enckey
	obj["b64kid"] =base64.b64encode(bytearray.fromhex(kid)).decode("ISO-8859-1")
	obj["b64key"] =base64.b64encode(bytearray.fromhex(enckey)).decode("ISO-8859-1")
	
	val = registerContent(token, contentid)
	if(val!=contentid): raise Exception("Registering a content failed (%s)" % (contentid) )
	val = registerContentKey( token, contentid, obj["kidGuid"], obj["b64key"] )
	if(val!=obj["kidGuid"]): raise Exception("Registering a content key failed (%s, %s)" % (contentid, obj["kidGuid"]) )

	obj["playready"]="%s/licenseServer/%s/v1/%s/license?contentId=%s" % (SERVICE_URL, "playready", ACCOUNT, contentid)
	obj["widevine"] ="%s/licenseServer/%s/v1/%s/license?contentId=%s" % (SERVICE_URL, "widevine", ACCOUNT, contentid)
	
	return obj;

def main():
	## parse command line arguments
	parser = OptionParser(add_help_option=False)
	parser.add_option("-h", "--help", action="help")
	parser.add_option("--account", type="string", dest="account", help="Login account id")
	parser.add_option("--username", type="string", dest="username", help="Login username")
	parser.add_option("--password", type="string", dest="password", help="Login password")
	parser.add_option("--token", type="string", dest="token", help="Optional, if empty then login to get a new token")
	(options, args) = parser.parse_args()

	global SERVICE_URL, ACCOUNT
	ACCOUNT = options.account
	SERVICE_URL = SERVICE_URL.replace("${account}", options.account)

	## login to create token or use an existing token
	if(options.token==""): options.token=createToken(options.username, options.password)
	#print("token=" + options.token)
	
	now = datetime.datetime.utcnow()
	obj={}
	obj["created"]=now.strftime('%Y-%m-%dT%H:%M:%SZ')

	## Register KID and ENCKEY values to license service (do only once)
	obj["Test1234"]=register(options.token, "Test1234", "0x43215678123412341234123412341234", "0x12341234123412341234123412341234")
	obj["Test1235"]=register(options.token, "Test1235", "43215678123412341234123412341235", "12341234123412341234123412341235")
	obj["Test1236"]=register(options.token, "Test1236", "43215678123412341234123412341236", "12341234123412341234123412341236")
	obj["Test1237"]=register(options.token, "Test1237", "43215678123412341234123412341237", "12341234123412341234123412341237")
	obj["Test1238"]=register(options.token, "Test1238", "43215678123412341234123412341238", "12341234123412341234123412341238")
	obj["Test1239"]=register(options.token, "Test1239", "43215678123412341234123412341239", "12341234123412341234123412341239")
	
	obj = json.dumps(obj, indent=2, sort_keys=True, ensure_ascii=False)
	print(obj)

if __name__ == "__main__":
	main()
