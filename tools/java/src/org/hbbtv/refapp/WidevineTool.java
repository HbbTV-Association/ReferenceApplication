package org.hbbtv.refapp;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.util.*;

import com.google.protobuf.ByteString;
import com.google.protobuf.object.WidevineCencHeaderProto;

/**
 * Widevine: decode or encode protobuf object
 *
 * java -cp "../lib/*" org.hbbtv.refapp.WidevineTool mode=decode input="base64://AAAAR3Bzc2gAAAAA7e+LqXnWSs6jyCfc1R0h7QAAACcIARIBMBoNd2lkZXZpbmVfdGVzdCIKMjAxNV90ZWFycyoFQVVESU8="
 * java -cp "../lib/*" org.hbbtv.refapp.WidevineTool mode=encode keyid1="0x43215678123412341234123412341237" keyid2="0x43215678123412341234123412341236" provider="MyName" contentid="MyVideo" output="/temp/pssh.dat"
 * 
 */
public class WidevineTool {

	public static void main(String[] args) throws Exception {
		Map<String,String> params = Utils.parseParams(args);
		
		String mode = Utils.getString(params, "mode", "", true);		
		if(mode.equalsIgnoreCase("decode")) {
			// decode <cenc:pssh> widevine data
			String input = Utils.getString(params, "input", "", true);
			byte[] pssh;
			if(input.startsWith("base64://") || input.startsWith("b64://")) {
				// "base64://AAAAR3Bzc2gAAAAA7e+LqXnWSs6jyCfc1R0h7QAAACcIARIBMBoNd2lkZXZpbmVfdGVzdCIKMjAxNV90ZWFycyoFQVVESU8="
				pssh = Utils.base64Decode(input.substring(input.indexOf('/')+2) );
			} else if (input.startsWith("<cenc:pssh>")) {
				// "<cenc:pssh>AAAAR3Bzc2gAAAAA7e+LqXnWSs6jyCfc1R0h7QAAACcIARIBMBoNd2lkZXZpbmVfdGVzdCIKMjAxNV90ZWFycyoFQVVESU8=</cenc:pssh>"
				int endDelim = input.lastIndexOf("</cenc:pssh>");
				pssh = Utils.base64Decode(input.substring(input.indexOf('>')+1, endDelim>0?endDelim : input.length()) );
			} else {
				// "/temp/wv_data.dat" raw bytes
				pssh = Utils.readFile(new File(input));
			}
			
			System.out.println(String.format("Read %d bytes from %s", pssh.length, input));
			if (pssh.length>32 && pssh[4]=='p' && pssh[5]=='s' && pssh[6]=='s' && pssh[7]=='h') {
				byte[] buf=new byte[pssh.length-32];
				System.arraycopy(pssh,32,buf,0,buf.length);  // index 32..n is a widevine payload
				pssh=buf;
			}
			
			WidevineCencHeaderProto.WidevineCencHeader psshObj = 
				WidevineCencHeaderProto.WidevineCencHeader.parseFrom(pssh, null);
			System.out.println(psshObj.toString().trim());
			for(int idx=0; idx<psshObj.getKeyIdCount(); idx++) {
				byte[] buf=psshObj.getKeyId(idx).toByteArray();
				System.out.println(String.format("KeyID(%d)=%s", idx, Utils.bytesToHex(buf)));
			}
			
		} else if(mode.equalsIgnoreCase("encode")) {
			String alg = Utils.getString(params, "alg", "AESCTR", true); // algorithm AESCTR
			List<String> keyIds = new ArrayList<String>(4); // "keyid", "keyid0", keyid1", ...
			for(int idx=-1; ; idx++) {				
				String val = Utils.getString(params, "keyid"+(idx<0?"":""+idx), null, false); // hexvalue, 32 chars(16 bytes), 0xAABBCC..
				if(val==null) {
					if(idx>1) break;
				} else if (!val.isEmpty()) {
					keyIds.add(val);
				}
			}
			String provider = Utils.getString(params, "provider", null, false); // intertrust, usp-cenc, whatever, <null>
			String contentId= Utils.getString(params, "contentid", null, false); // MyContentId001, 0x1122AABB, <null>
			String trackType= Utils.getString(params, "tracktype", null, false); // HD,SD,AUDIO,<null>
			String policy   = Utils.getString(params, "policy", null, false);

			byte[] psshFull = createPSSH(alg, keyIds, provider, contentId, trackType, policy);
			byte[] pssh     = new byte[psshFull.length-32];
			System.arraycopy(psshFull,32,pssh,0,pssh.length);  // index 32..n is a widevine payload
			
			String filename = Utils.getString(params, "output", "", true);
			if(!filename.isEmpty())
				Utils.saveFile(new File(filename), psshFull);				

			// use pssh payload to print out fields
			WidevineCencHeaderProto.WidevineCencHeader psshObj = 
					WidevineCencHeaderProto.WidevineCencHeader.parseFrom(pssh, null);
			System.out.println(psshObj.toString().trim());
			for(int idx=0; idx<psshObj.getKeyIdCount(); idx++) {
				byte[] buf=psshObj.getKeyId(idx).toByteArray();
				System.out.println(String.format("KeyID(%d)=%s", idx, Utils.bytesToHex(buf)));
			}			
			System.out.println("b64(pssh): " + Utils.base64Encode(psshFull));
			System.out.println("b64(payload): " + Utils.base64Encode(pssh));
		}

	}

	/**
	 * Create Widevine PSSH data.
	 * @param alg		AESCTR
	 * @param keyIds	one or more KeyIDs
	 * @param provider
	 * @param contentId
	 * @param trackType
	 * @param policy
	 * @return	full PSSH bytes, 0..31 is mp4 box header, 32..n is widevine protobuf object
	 * @throws IOException
	 */
	public static byte[] createPSSH(String alg, List<String> keyIds,
			String provider, String contentId, String trackType, String policy) 
			throws IOException {
		if(alg==null || alg.isEmpty()) alg="AESCTR";
		WidevineCencHeaderProto.WidevineCencHeader.Builder psshBuilder=WidevineCencHeaderProto.WidevineCencHeader.newBuilder();		
		psshBuilder.setAlgorithm( WidevineCencHeaderProto.WidevineCencHeader.Algorithm.valueOf(alg) );
		for(String val : keyIds) {
			if(val!=null && !val.isEmpty())
				psshBuilder.addKeyId( ByteString.copyFrom( val.startsWith("0x") ?
						Utils.hexToBytes(val) : val.getBytes("ISO-8859-1") ) );
		}
		if(provider!=null && !provider.isEmpty()) 
			psshBuilder.setProvider(provider); // intertrust, usp-cenc, whatever, <null>
		if(contentId!=null && !contentId.isEmpty())
			psshBuilder.setContentId( ByteString.copyFrom( contentId.startsWith("0x") ?
				Utils.hexToBytes(contentId) : contentId.getBytes("ISO-8859-1") ) );
		if (trackType!=null && !trackType.isEmpty()) 
			psshBuilder.setTrackTypeDeprecated(trackType);
		if (policy!=null && !policy.isEmpty()) 
			psshBuilder.setPolicy(policy);
		
		WidevineCencHeaderProto.WidevineCencHeader psshObj = psshBuilder.build();		
		byte[] pssh=psshObj.toByteArray(); // widevine protobuf object
		ByteArrayOutputStream baos = new ByteArrayOutputStream(64);
		baos.write(Utils.toIntArray(32+pssh.length)); // length, 0..31=pssh header, 32..n=payload
		baos.write(new byte[]{ 'p','s','s','h' }); // boxId
		baos.write(new byte[] { (byte)0x00,(byte)0x00,(byte)0x00,(byte)0x00 }); // PSSH version=0
		baos.write(Utils.hexToBytes(DashDRM.SYSID_WIDEVINE)); // SystemId 16-bytes
		baos.write(Utils.toIntArray(pssh.length)); // payload length, not including this length field
		baos.write(pssh); // payload
		return baos.toByteArray();		
	}	
	
}
