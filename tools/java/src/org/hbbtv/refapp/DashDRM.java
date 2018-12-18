package org.hbbtv.refapp;

import java.util.*;
import java.io.*;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;

import com.google.protobuf.object.WidevineCencHeaderProto;
import com.google.protobuf.ByteString;

/**
 * Dash DRMSystem helper functions.
 * Systems: playready, widevine, marlin, cenc 
 */
public class DashDRM {
	// http://dashif.org/identifiers/protection/
	public static final String SYSID_PLAYREADY= "9A04F07998404286AB92E65BE0885F95";     // PSSH SystemId
	public static final String GUID_PLAYREADY = "9a04f079-9840-4286-ab92-e65be0885f95"; // SchemeId GUID
	public static final String SYSID_MARLIN   = "69f908af481646ea910ccd5dcccb0a3a";     // SysId and GUID does not
	public static final String GUID_MARLIN    = "5e629af5-38da-4063-8977-97ffbd9902d4"; // equal for Marlin.
	public static final String SYSID_WIDEVINE = "EDEF8BA979D64ACEA3C827DCD51D21ED";
	public static final String GUID_WIDEVINE  = "edef8ba9-79d6-4ace-a3c8-27dcd51d21ed";
	public static final String SYSID_CENC     = "1077efecc0b24d02ace33c1e52e2fb4b";
	public static final String GUID_CENC      = "1077efec-c0b2-4d02-ace3-3c1e52e2fb4b";
	// https://dashif.org/docs/DASH-IF-IOP-v4.2-clean.htm#_Toc511040865
	public static final String SYSID_CLEARKEY = "e2719d58a985b3c9781ab030af78d30e";
	public static final String GUID_CLEARKEY  = "e2719d58-a985-b3c9-781a-b030af78d30e";
	
	private SecureRandom rand = new SecureRandom();
	private Map<String,String> params;

	/**
	 * Initialize drm.* arguments.
	 * @param params
	 * @throws NoSuchAlgorithmException 
	 */
	public void initParams(Map<String,String> params) {
		// should use RandomNumberGenerator?
		if (params.get("drm.kid").equals("rng"))
			params.put("drm.kid", "0x"+Utils.bytesToHex(randomizeBytes(16)) );
		if (params.get("drm.key").equals("rng"))
			params.put("drm.key", "0x"+Utils.bytesToHex(randomizeKey(16)) );
		if (!params.containsKey("drm.playready.laurl"))
			params.put("drm.playready.laurl", "");
		
		String val = Utils.getString(params, "drm.iv", "rng", true);
		if (val.equals("rng"))
			params.put("drm.iv", "0x"+Utils.bytesToHex(randomizeBytes(8)) );
		
		this.params=params;
	}

	/**
	 * Create GPACDRM.xml specification, this is required for
	 * encryption of output/temp-v1.mp4 to output/drm/temp-v1.mp4 process.
	 * @throws Exception
	 */
	public String createGPACDRM() throws Exception {
		String val;
		StringBuilder buf = new StringBuilder();

		buf.append("<?xml version=\"1.0\" encoding=\"UTF-8\" ?>" + Dasher.NL);
		buf.append("<GPACDRM type=\"CENC AES-CTR\">"+Dasher.NL);

		// write KID,KEY,IV values to xml comment (0xAABBCC..DD)
		String kid = Utils.getString(params, "drm.kid", "", true);
		String key = Utils.getString(params, "drm.key", "", true);
		String iv  = Utils.getString(params, "drm.iv", "", true);
		buf.append("<!-- "+Dasher.NL);
		buf.append("  kid=" + kid +Dasher.NL);
		buf.append("  key=" + key +Dasher.NL);
		buf.append("  iv="  + iv  +Dasher.NL);
		buf.append("--> "+Dasher.NL);
		
		// write Playready(0,pro,pssh)
		val = Utils.getString(params, "drm.playready", "0", true);
		if (!val.equals("0")) {
			String laurl= Utils.getString(params, "drm.playready.laurl", "", true);			
			byte[] wrm = createPlayreadyXML(kid, key, laurl).getBytes("UTF-16LE");
			buf.append(Dasher.NL);
			buf.append("<!-- Playready -->"+Dasher.NL);
			buf.append("<DRMInfo type=\"pssh\" version=\"0\">"+Dasher.NL);
			buf.append("  <BS ID128=\""+SYSID_PLAYREADY+"\"/>"+Dasher.NL); // SystemID
			buf.append("  <BS bits=\"32\" endian=\"little\" value=\"" +(wrm.length+10)+ "\"/>"+Dasher.NL); // SizeOfPRO table
			buf.append("  <BS bits=\"16\" endian=\"little\" value=\"1\"/>"+Dasher.NL); // one key supported only for now
			buf.append("  <BS bits=\"16\" endian=\"little\" value=\"1\"/>"+Dasher.NL);
			buf.append("  <BS bits=\"16\" endian=\"little\" value=\"" +wrm.length+ "\"/>"+Dasher.NL); // SizeOfWRM
			buf.append("  <BS data64=\"" +Utils.base64Encode(wrm)+ "\"/>"+Dasher.NL); // wrm.xml object
			buf.append("</DRMInfo>"+Dasher.NL);
		}

		// Write Widevine(0,1), this does not use a protobuf generator for now.
		val = Utils.getString(params, "drm.widevine", "0", true);
		if (!val.equals("0")) {
			buf.append(Dasher.NL);
			buf.append("<!-- Widevine -->"+Dasher.NL);
			buf.append("<DRMInfo type=\"pssh\" version=\"0\">"+Dasher.NL);
			buf.append("  <BS ID128=\""+SYSID_WIDEVINE+"\"/>"+Dasher.NL); // SystemID
			buf.append("  <BS data=\"0x08011210\"/>"+Dasher.NL); // protobuf field prefix
			buf.append("  <BS ID128=\"" + kid.substring(2)+ "\"/>"+Dasher.NL); // kid
			buf.append("</DRMInfo>"+Dasher.NL);
		}

		// Write Marlin(0,1)
		val = Utils.getString(params, "drm.marlin", "0", true);
		if (!val.equals("0")) {
			buf.append(Dasher.NL);
			buf.append("<!-- Marlin -->"+Dasher.NL);
			buf.append("<DRMInfo type=\"pssh\" version=\"0\">"+Dasher.NL);
			buf.append("  <BS ID128=\""+SYSID_MARLIN+"\"/>"+Dasher.NL); // SystemID
			buf.append("  <BS data=\"0x000000186d61726c000000106d6b69640000000000000000\"/>"+Dasher.NL); // 0x18, "marl", 0x10, "mkid", emptyKID
			buf.append("</DRMInfo>"+Dasher.NL);
		}

		// Write EME-CENC|CLEARKEY(0,1) init/PSSH(v1) + manifest_clearkey.mpd/1077ef*cenc:pssh(v1)
		boolean writeCenc=false;
		writeCenc = writeCenc || !Utils.getString(params, "drm.clearkey", "0", true).equals("0");		

		// Write MPEG-CENC(0,1) init/PSSH(v1) + "urn:mpeg:dash:mp4protection:2011" <ContentProtection>
		writeCenc = writeCenc || !Utils.getString(params, "drm.cenc", "0", true).equals("0");
		
		if (writeCenc) {
			int ver = 1; // use version=1 for cenc PSSH object
			buf.append(Dasher.NL);
			buf.append("<!-- CENC -->"+Dasher.NL);
			buf.append("<DRMInfo type=\"pssh\" version=\""+ver+"\">"+Dasher.NL);
			buf.append("  <BS ID128=\""+SYSID_CENC+"\"/>"+Dasher.NL); // SystemID
			buf.append("  <BS bits=\"32\" value=\"1\"/>"+Dasher.NL); // KIDCount
			buf.append("  <BS ID128=\"" + kid.substring(2)+ "\"/>"+Dasher.NL); // kid
			buf.append("</DRMInfo>"+Dasher.NL);
		}

		// pending: ADOBE_PRIMETIME "f239e769efa348509c16a903c6932efb", "urn:uuid:F239E769-EFA3-4850-9C16-A903C6932EFB"
		
		// write encryption keys, supports one KEY for now
		buf.append(Dasher.NL);
		buf.append("<CrypTrack trackID=\"1\" IsEncrypted=\"1\" IV_size=\"8\" first_IV=\"" +iv+ "\" saiSavedBox=\"senc\">"+Dasher.NL);
		buf.append("  <key KID=\"" + kid+ "\" value=\"" +key+ "\"/>"+Dasher.NL);
		buf.append("</CrypTrack>"+Dasher.NL);
				
		buf.append(Dasher.NL);
		buf.append("</GPACDRM>");
		return buf.toString();
	}
	
	public String createPlayreadyMPDElement() throws Exception {
		String opt = Utils.getString(params, "drm.playready", "0", true); // 0,1,pro,pssh
		if (opt.equals("0")) return ""; // do not create element
		else if (opt.equals("1")) opt="pro,pssh";
		
		String kid = Utils.getString(params, "drm.kid", "", true);
		String key = Utils.getString(params, "drm.key", "", true);
		String laurl= Utils.getString(params, "drm.playready.laurl", "", true);
		byte[] wrm = createPlayreadyXML(kid, key, laurl).getBytes("UTF-16LE");
		
		StringBuilder buf = new StringBuilder();
		buf.append("<ContentProtection schemeIdUri=\"urn:uuid:"+GUID_PLAYREADY+"\">"+Dasher.NL);
		for(String optTag : opt.split(",")) {
			if (optTag.equals("pro"))
				buf.append("  <mspr:pro>"+createPlayreadyPRO(wrm)+"</mspr:pro>"+Dasher.NL);
			else if (optTag.equals("pssh"))
				buf.append("  <cenc:pssh>"+createPlayreadyPSSH(wrm)+"</cenc:pssh>"+Dasher.NL);
		}
		buf.append("</ContentProtection>"+Dasher.NL);
		return buf.toString();
	}
	
	public String createWidevineMPDElement() throws Exception {
		String opt = Utils.getString(params, "drm.widevine", "0", true);
		if (opt.equals("0")) return ""; // do not create element
		
		String kid = Utils.getString(params, "drm.kid", "", true);
		String prov= Utils.getString(params, "drm.widevine.provider", "", true);
		String cid = Utils.getString(params, "drm.widevine.contentid", "", true);
		StringBuilder buf = new StringBuilder();
		buf.append("<ContentProtection schemeIdUri=\"urn:uuid:"+GUID_WIDEVINE+"\">"+Dasher.NL);
		buf.append("  <cenc:pssh>"+ createWidevinePSSH(kid, prov, cid) +"</cenc:pssh>"+Dasher.NL);		
		buf.append("</ContentProtection>"+Dasher.NL);
		return buf.toString();		
	}
	
	public String createMarlinMPDElement() throws Exception {
		String opt = Utils.getString(params, "drm.marlin", "0", true);
		if (opt.equals("0")) return ""; // do not create element

		String kid = Utils.getString(params, "drm.kid", "", true);		
		StringBuilder buf = new StringBuilder();
		buf.append("<ContentProtection schemeIdUri=\"urn:uuid:5e629af5-38da-4063-8977-97ffbd9902d4\">"+Dasher.NL);
		buf.append("  <mas:MarlinContentIds>");
		buf.append("<mas:MarlinContentId>urn:marlin:kid:"+ kid.substring(2) +"</mas:MarlinContentId>");
		buf.append("</mas:MarlinContentIds>"+Dasher.NL);
		buf.append("</ContentProtection>"+Dasher.NL);
		return buf.toString();		
	}

	public String createClearKeyMPDElement() throws Exception {
		String opt = Utils.getString(params, "drm.clearkey", "0", true);
		if (opt.equals("0")) return ""; // do not create element

		String scheme= GUID_CLEARKEY;
		String laurl = Utils.getString(params, "drm.clearkey.laurl", "", true);
		
		StringBuilder buf = new StringBuilder();
		buf.append("<ContentProtection schemeIdUri=\"urn:uuid:"+scheme+"\" value=\"ClearKey1.0\">"+Dasher.NL);
		if (!laurl.isEmpty())
			buf.append("<ck:Laurl Lic_type=\"EME-1.0\">"+ Utils.XMLEncode(laurl, false, false) +"</ck:Laurl>"+Dasher.NL);
		buf.append("</ContentProtection>"+Dasher.NL);
		return buf.toString();
	}

	public String createCENCMPDElement() throws Exception {
		String opt = Utils.getString(params, "drm.cenc", "0", true);
		if (opt.equals("0")) return ""; // do not create element

		String scheme= GUID_CENC;
		String kid   = Utils.getString(params, "drm.kid", "", true);
		
		StringBuilder buf = new StringBuilder();
		buf.append("<ContentProtection schemeIdUri=\"urn:uuid:"+scheme+"\">"+Dasher.NL);
		buf.append("  <cenc:pssh>"+createPSSHv1(scheme.replace("-", ""), kid)+"</cenc:pssh>"+Dasher.NL);
		buf.append("</ContentProtection>"+Dasher.NL);
		return buf.toString();
	}

	private String createPlayreadyXML(String kid, String key, String laurl) throws Exception {
		byte[] kidbuf = Utils.hexToBytes(kid);
		byte[] keybuf = Utils.hexToBytes(key);
		
		// flip bytes according to Playready KID specification
		// KID(hex)=0x43215678123412341234123412341234
		// KID(xml)=43215678-1234-1234-1234-123412341234 -> KID(bytes)=78562143 3412 3412 1234 123412341234		
		Utils.flipBytes(kidbuf, 0, 4);
		Utils.flipBytes(kidbuf, 4, 2);
		Utils.flipBytes(kidbuf, 6, 2);

		// 16-byte KID is encrypted with 16-byte AES content KEY using ECB mode. 
		// First 8 bytes are extracted and BASE64 encoded, use it for checksum.
        Cipher cipher = Cipher.getInstance("AES/ECB/NoPadding");
		SecretKeySpec keySpec = new SecretKeySpec(keybuf, "AES");
        cipher.init(Cipher.ENCRYPT_MODE, keySpec);
        byte[] checkbuf = cipher.doFinal(kidbuf); // encrypt KID with KEY spec
        checkbuf = Arrays.copyOf(checkbuf, 8);

        String val = "<WRMHEADER xmlns=\"http://schemas.microsoft.com/DRM/2007/03/PlayReadyHeader\" version=\"4.0.0.0\"><DATA><PROTECTINFO><KEYLEN>16</KEYLEN><ALGID>AESCTR</ALGID></PROTECTINFO><KID>${kid}</KID><CHECKSUM>${check}</CHECKSUM>"
        			+"<LA_URL>${laurl}</LA_URL></DATA></WRMHEADER>";
        val=val.replace("${kid}", Utils.base64Encode(kidbuf))
        	.replace("${check}", Utils.base64Encode(checkbuf));
        val = laurl.isEmpty() ?
        	val.replace("<LA_URL>${laurl}</LA_URL>", "") :
        	val.replace("${laurl}", Utils.XMLEncode(laurl, true, false) );
        
        return val;
	}
	
	private String createPlayreadyPSSH(byte[] xmlBytes) throws IOException {
		// create <cenc:pssh>BgIAAE..<cenc:pssh> value for <ContentProtection> element
		ByteArrayOutputStream baos = new ByteArrayOutputStream(xmlBytes.length+42);

		baos.write(new byte[4]);   // packet length placeholder, value is written at the end
		baos.write(new byte[]{ 'p','s','s','h' }); // table identifier
		
		baos.write(new byte[] { (byte)0x00,(byte)0x00,(byte)0x00,(byte)0x00 }); // PSSH version=0
		baos.write(Utils.hexToBytes(SYSID_PLAYREADY) ); // PSSH PlayReadySystemID
		baos.write(new byte[4]);   // placeholder length of PSSH payload(bytes+4 byte len field), bigEndian
		baos.write(new byte[4]);   // -"- littleEndian
		
		baos.write(new byte[] { (byte)0x01,(byte)0x00 }); // one object (LittleEndian)
		baos.write(new byte[] { (byte)0x01,(byte)0x00 }); // 1=drm object type (LittleEndian)
		baos.write(Utils.toIntArrayLE(xmlBytes.length), 0, 2); // length of object, write 16bits
		baos.write(xmlBytes);
		
		byte[] psshBytes = baos.toByteArray();
		System.arraycopy(Utils.toIntArray(psshBytes.length-8-4-16-4), 0, psshBytes, 8+4+16, 4); // 4-byte length fields
		System.arraycopy(Utils.toIntArrayLE(psshBytes.length-8-4-16-4), 0, psshBytes, 8+4+16+4, 4);
		System.arraycopy(Utils.toIntArray(psshBytes.length), 0, psshBytes, 0, 4); // packet length		
		return Utils.base64Encode(psshBytes);
	}
	
	private String createPlayreadyPRO(byte[] xmlBytes) throws Exception {
		// create <mspr:pro>BgIAAE..<mspr:pro> value for <ContentProtection> element
		ByteArrayOutputStream baos = new ByteArrayOutputStream(xmlBytes.length+42);
		baos.write(new byte[4]); // 4-byte length placeholder, value is written at the end
		baos.write(new byte[] { (byte)0x01,(byte)0x00 }); // one object (LittleEndian)
		baos.write(new byte[] { (byte)0x01,(byte)0x00 }); // 1=drm object type (LittleEndian)
		baos.write(Utils.toIntArrayLE(xmlBytes.length), 0, 2); // length of object, write 16bits
		baos.write(xmlBytes); // write object payload
		byte[] psshBytes = baos.toByteArray();
		System.arraycopy(Utils.toIntArrayLE(psshBytes.length), 0, psshBytes, 0, 4); // 4-byte length field
		return Utils.base64Encode(psshBytes);		
	}

	private String createWidevinePSSH(String kid, String provider, String contentId) throws IOException {
		// Use ProtoBuffer builder, set ALG,KID,PROVIDER
		WidevineCencHeaderProto.WidevineCencHeader.Builder psshBuilder=WidevineCencHeaderProto.WidevineCencHeader.newBuilder();
		psshBuilder.setAlgorithm( WidevineCencHeaderProto.WidevineCencHeader.Algorithm.valueOf("AESCTR") );
		psshBuilder.addKeyId( ByteString.copyFrom(Utils.hexToBytes(kid)) );
		if (!provider.isEmpty())  psshBuilder.setProvider(provider); // intertrust, usp-cenc, widevine_test, whatever, ..
		if (!contentId.isEmpty()) psshBuilder.setContentId( ByteString.copyFrom(contentId,"ISO-8859-1") );
		WidevineCencHeaderProto.WidevineCencHeader psshObj = psshBuilder.build();

		byte[] pssh=psshObj.toByteArray(); // pssh payload
		ByteArrayOutputStream baos = new ByteArrayOutputStream(64);
		baos.write(Utils.toIntArray(32+pssh.length)); // length, fixed 32-bytes prefix in PSSH box
		baos.write(new byte[]{ 'p','s','s','h' }); // boxId
		baos.write(new byte[] { (byte)0x00,(byte)0x00,(byte)0x00,(byte)0x00 }); // PSSH version=0
		baos.write(Utils.hexToBytes(SYSID_WIDEVINE)); // SystemId 16-bytes
		baos.write(Utils.toIntArray(pssh.length)); // payload length, not including this length field
		baos.write(pssh); // payload
		
		return Utils.base64Encode(baos.toByteArray());
	}

	@SuppressWarnings("unused")
	private String createPSSHv0(String scheme, String kid) throws IOException {
		// create VERSION0 <cenc:pssh>BgIAAE..<cenc:pssh> value for <ContentProtection> element
		ByteArrayOutputStream baos = new ByteArrayOutputStream(64);

		baos.write(new byte[4]);   // packet length placeholder, value is written at the end
		baos.write(new byte[]{ 'p','s','s','h' }); // table identifier
		
		baos.write(new byte[] { (byte)0x00,(byte)0x00,(byte)0x00,(byte)0x00 }); // version=0
		baos.write(Utils.hexToBytes(scheme) ); // SystemID
		
		baos.write(new byte[] { (byte)0x00,(byte)0x00,(byte)0x00,(byte)0x14 }); // length of KIDs
		baos.write(new byte[] { (byte)0x00,(byte)0x00,(byte)0x00,(byte)0x01 }); // KID count(1)
		baos.write( Utils.hexToBytes(kid) );
		
		byte[] psshBytes = baos.toByteArray();
		System.arraycopy(Utils.toIntArray(psshBytes.length), 0, psshBytes, 0, 4); // packet length(00,00,00,34)		
		return Utils.base64Encode(psshBytes);
	}
		
	private String createPSSHv1(String scheme, String kid) throws IOException {
		// create VERSION1 <cenc:pssh>BgIAAE..<cenc:pssh> value for <ContentProtection> element
		ByteArrayOutputStream baos = new ByteArrayOutputStream(64);

		baos.write(new byte[4]);   // packet length placeholder, value is written at the end
		baos.write(new byte[]{ 'p','s','s','h' }); // table identifier
		
		baos.write(new byte[] { (byte)0x01,(byte)0x00,(byte)0x00,(byte)0x00 }); // version=1
		baos.write(Utils.hexToBytes(scheme) ); // SystemID
		
		baos.write(new byte[] { (byte)0x00,(byte)0x00,(byte)0x00,(byte)0x01 }); // KID count(1)
		baos.write( Utils.hexToBytes(kid) );
		baos.write(new byte[] { (byte)0x00,(byte)0x00,(byte)0x00,(byte)0x00 }); // Data length(0)
		
		byte[] psshBytes = baos.toByteArray();
		System.arraycopy(Utils.toIntArray(psshBytes.length), 0, psshBytes, 0, 4); // packet length(00,00,00,34)		
		return Utils.base64Encode(psshBytes);
	}
	
	private byte[] randomizeBytes(int len) {
		byte[] buf = new byte[len]; // KID=16, KEY=16, IV=8
		rand.nextBytes(buf);
		return buf;
	}
	
	private byte[] randomizeKey(int len) throws IllegalArgumentException {
		try {
			KeyGenerator keyGen = KeyGenerator.getInstance("AES");
			keyGen.init(len*8, rand); // 16*8=128bits
			SecretKey key = keyGen.generateKey();
			return key.getEncoded();
		} catch (Exception ex) {
			throw new IllegalArgumentException(ex);
		}
	}
	
}
