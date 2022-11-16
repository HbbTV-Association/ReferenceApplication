#!/usr/bin/env python
## Simple Key Management (SKM) DRM script
##   register KID+KEY, AES unwrapping
## Aki Nieminen/Sofia Digital
## 2022-09-30/Aki: initial release, expressplay

import sys, os, time, datetime, json, base64, urllib.request, urllib.error, urllib.parse
import struct  #,binascii
from optparse import OptionParser
from Cryptodome.Cipher import AES

URL_SKM = "https://api.service.expressplay.com/keystore"

def getOptionValue(options, optItem, defVal):
	if optItem==None: return defVal
	return getattr(options, optItem.dest)

def getKey(auth, kek, kid):	
	## Get key from SKM, if "?kek=xxx" is given then server does "ek" to "k" aes unwrapping
	buf=None
	if kid=="": return buf
	params = {
		"customerAuthenticator" : auth
	}
	if kek!="": params["kek"]=kek
	
	url = URL_SKM+"/keys/" + kid + "?"+urllib.parse.urlencode(params)
	print("Get KID %s" % (kid))
	req = urllib.request.Request(url, method="GET")
	
	try:	
		buf = urllib.request.urlopen(req, timeout=60).read()
	except urllib.error.HTTPError as err:
		print("HTTP Error " + str(err.code))
		print(err.read().decode())
		raise err
	return buf
	
def listKeys(auth, kek):	
	## list keys from SKM, if "?kek=xxx" is given then server does "ek" to "k" aes unwrapping
	buf=None
	params = {
		"customerAuthenticator" : auth
	}
	if kek!="": params["kek"]=kek
	
	url = URL_SKM+"/keys" + "?"+urllib.parse.urlencode(params)
	print("List keys")
	req = urllib.request.Request(url, method="GET")
	
	try:	
		buf = urllib.request.urlopen(req, timeout=60).read()
	except urllib.error.HTTPError as err:
		print("HTTP Error " + str(err.code))
		print(err.read().decode())
		raise err
	return buf	

def registerKey(auth, kek, kid, key, contentId):	
	## register KID+KEY using a clear value "k" or "ek" encrypted field.
	## If using "k" then KEK must be given to SKM server,
	## if using "ek" then KEK is empty.
	buf=None
	suffix = kid[-4:] ## last four chars from KID
	if contentId=="": contentId="Prod" + suffix ## "Prod1236"

	jsonObj={
		"kid" : kid, ## hex 16byte(32 chars)
		"kekId" : "Refapp" + suffix,
		"info" : "Reference app key " + suffix
		,"expiration" : "2032-10-04T09:00:00Z"  ## ISO8601 "2022-10-03T12:33:43Z"
	}
	if kek!=""  : jsonObj["k"]=key   ## key in clear value hex format
	elif kek=="": jsonObj["ek"]=key  ## key in encrypted hex format (client must do aes wrapping and unwrapping)
	
	if contentId!="": jsonObj["contentId"]=contentId  ## Widevine contentId
	
	params = {
		"customerAuthenticator" : auth
	}
	if kek!="": params["kek"]=kek
	
	url = URL_SKM+"/keys?"+urllib.parse.urlencode(params)
	print("Register KID %s" % (kid))
	req = urllib.request.Request(url, method="POST")
	req.add_header("Content-Type", "application/json")
	
	try:	
		buf = urllib.request.urlopen(req, data=json.dumps(jsonObj).encode(), timeout=60).read()
	except urllib.error.HTTPError as err:
		print("HTTP Error " + str(err.code))
		print(err.read().decode())
		raise err
	return buf

def removeKey(auth, kid):
	## Remove key from SKM	
	buf=None
	if kid=="": return buf
	params = {
		"customerAuthenticator" : auth
	}
	
	url = URL_SKM+"/keys/" + kid + "?"+urllib.parse.urlencode(params)
	print("Remove KID %s" % (kid))
	req = urllib.request.Request(url, method="DELETE")
	
	try:	
		buf = urllib.request.urlopen(req, timeout=60).read()
		jsonObj={ "kid": kid }
		buf = json.dumps(jsonObj).encode()
	except urllib.error.HTTPError as err:
		print("HTTP Error " + str(err.code))
		print(err.read().decode())
		raise err
	return buf

def wrapKey(kek, key):
	## wrap a clear value "k" key to a wrapped encrypted "ek" key
	if key=="": return None

	bKek        = bytearray.fromhex(kek)
	bKey        = bytearray.fromhex(key)
	bWrappedKey = aes_wrapKey(bKek, bKey)
	bUnwrappedKey, bIv= aes_unwrapKey(bKek, bWrappedKey)

	print("Wrap KEY %s" % (key))
	jsonObj={
		"kek": bKek.hex().upper(),
		"k"  : bKey.hex().upper(),
		"ek" : bWrappedKey.hex().upper(),
		"iv" : format(bIv, "x").upper(), ## convert int to hex
		"k_unwrapped": bUnwrappedKey.hex().upper()  ## verify "k"=="k_unwrapped" values
	}
	return json.dumps(jsonObj, indent=2, sort_keys=False, ensure_ascii=False).encode()	
	
def unwrapKey(kek, key):
	## unwrap an encrypted "ek" key to a clear value "k" key
	if key=="": return None
	bKek       = bytearray.fromhex(kek) ## wrapped key (AES encrypted)
	bKey       = bytearray.fromhex(key)
	bUnwrappedKey, bIv= aes_unwrapKey(bKek, bKey) ## IV is an integer number
	
	print("Unwrap KEY %s" % (key))
	jsonObj={
		"kek": bKek.hex().upper(),
		"ek" : bKey.hex().upper(),
		"iv" : format(bIv, "x").upper(), ## convert int to hex
		"k"  : bUnwrappedKey.hex().upper()
	}
	return json.dumps(jsonObj, indent=2, sort_keys=False, ensure_ascii=False).encode()		
	
def aes_wrapKey(kek, plaintext, iv=0xa6a6a6a6a6a6a6a6):
## AES Wrap a cleartext encryption key (encrypt a key)
## https://medium.com/asecuritysite-when-bob-met-alice/encrypting-the-encryption-key-its-a-wrap-47ec84ec12f5
## default IV(hex) is "12008468691120727718" as an integer value
	QUAD = struct.Struct('>Q')
	n = len(plaintext)//8
	R = [None]+[plaintext[i*8:i*8+8] for i in range(0, n)]
	A = iv
	encrypt = AES.new(kek, AES.MODE_ECB).encrypt
	for j in range(6):
		for i in range(1, n+1):
			B = encrypt(QUAD.pack(A) + R[i])
			A = QUAD.unpack(B[:8])[0] ^ (n*j + i)
			R[i] = B[8:]
	return QUAD.pack(A) + b"".join(R[1:])	

def aes_unwrapKey(kek, wrapped):
## AES Unwrap an encrypted key (decrypt a key)
## key,iv=aes_unwrapKey(KEK, wrappedKey)
	QUAD = struct.Struct('>Q')
	n = len(wrapped)//8 - 1
	#NOTE: R[0] is never accessed, left in for consistency with RFC indices
	R = [None]+[wrapped[i*8:i*8+8] for i in range(1, n+1)]
	A = QUAD.unpack(wrapped[:8])[0]
	decrypt = AES.new(kek, AES.MODE_ECB).decrypt
	for j in range(5,-1,-1): #counting down
		for i in range(n, 0, -1): #(n, n-1, ..., 1)
			ciphertext = QUAD.pack(A^(n*j+i)) + R[i]
			B = decrypt(ciphertext)
			A = QUAD.unpack(B[:8])[0]
			R[i] = B[8:]
	return b"".join(R[1:]), A
		
#################################
#################################

def main():
	## parse command line arguments
	parser = OptionParser(add_help_option=False)
	parser.add_option("-h", "--help", action="help")
	parser.add_option("--auth", type="string", dest="auth", default="", help="Authentication key for production service")
	parser.add_option("--action", type="string", dest="action", default="get", help="Action (list, get, register, remove, unwrap, wrap)")
	parser.add_option("--kid.0", type="string", dest="kid0", default="", help="KID hex string for video")
	parser.add_option("--key.0", type="string", dest="key0", default="", help="KEY hex string for video")
	parser.add_option("--kek.0", type="string", dest="kek0", default="", help="KEK hex string to AES wrap a key")
	parser.add_option("--contentid", type="string", dest="contentid", default="", help="Content id (Widevine)")	
	(options, args) = parser.parse_args()

	now = datetime.datetime.utcnow()

	## for now use just one kid+key+kek input values "--kid.0", "--kid.1", ..
	for idx in range(0,2,1): ## startInclusive, endExclusive, step
		optKid = parser.get_option("--kid."+str(idx))
		optKey = parser.get_option("--key."+str(idx))
		optKek = parser.get_option("--kek."+str(idx))		
		
		buf = None
		if options.action == "get":
			if optKid==None: continue
			buf = getKey( options.auth,
				getOptionValue(options, optKek, ""),
				getOptionValue(options, optKid, "") )
		elif options.action == "list":
			if optKek==None: continue
			buf = listKeys( options.auth, getOptionValue(options, optKek, "") )
		elif options.action == "register":
			if optKek!=None and getattr(options, optKek.dest)!="":
				## use KID+KEY using a clear value "k" key, KEK is still a mandatory param
				buf = registerKey( options.auth,
					getattr(options, optKek.dest),
					getattr(options, optKid.dest), 
					getattr(options, optKey.dest), ## "k" as a clear value
					options.contentid )
			elif optKek!=None and getattr(options, optKek.dest)=="":
				## use KID+KEY using an encrypted value "ek" key, KEK is not given to a server.
				buf = registerKey( options.auth,
					"",
					getattr(options, optKid.dest), 
					getattr(options, optKey.dest), ## "ek" as an encrypted value
					options.contentid )
				
		elif options.action == "remove":
			if optKid==None: continue
			buf = removeKey( options.auth, getattr(options, optKid.dest) )
			
		elif options.action == "unwrap":
			if optKey==None: continue
			buf = unwrapKey( getOptionValue(options, optKek, ""),
				getOptionValue(options, optKey, "") )
		elif options.action == "wrap":
			if optKey==None: continue
			buf = wrapKey( getOptionValue(options, optKek, ""),
				getOptionValue(options, optKey, "") )
					
		#endOf-if
			
		if buf!=None:
			with open("registerdrm_skm_"+str(idx)+".json", 'wb') as output:
				output.write(buf)
	#endOf-for
	
	return 0

if __name__ == "__main__":
	main()
