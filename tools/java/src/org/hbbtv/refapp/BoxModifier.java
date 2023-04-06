package org.hbbtv.refapp;

import java.io.*;
import java.util.*;
import org.mp4parser.IsoFile;
import org.mp4parser.boxes.iso23001.part7.ProtectionSystemSpecificHeaderBox;
import org.mp4parser.boxes.iso14496.part12.TrackRunBox;
import org.mp4parser.Box;
import org.mp4parser.Container;

/**
 * Modify init.mp4 or seg.m4s MP4 boxes(=atom,tables).
 *
 * Remove SENC box:
 *  java -cp "./lib/*" org.hbbtv.refapp.BoxModifier input=dash/v1_i.mp4 mode=remove path=moov/trak/senc
 * Remove UDTA user-defined metadata box:
 *  java -cp "./lib/*" org.hbbtv.refapp.BoxModifier input=dash/v1_i.mp4 mode=remove path=moov/udta
 * Remove SampleGroup and fix trun.dataoffset value:
 *  java -cp "./lib/*" org.hbbtv.refapp.BoxModifier input=dash/v1_i.mp4 mode=remove path=sgpd-sbgp  
 * Remove all PSSH boxes:
 *  java -cp "./lib/*" org.hbbtv.refapp.BoxModifier input=dash/v1_i.mp4 mode=remove path=moov/pssh[*] output=dash/v1_i_nopssh.mp4
 * Keep one PSSH and remove other atoms (playready,widevine,marlin,cenc):
 *  java -cp "./lib/*" org.hbbtv.refapp.BoxModifier mode=keepPSSH input=dash/v1_i.mp4 output=dash/v1_i_pr.mp4 drm=playready
 */
public class BoxModifier {

	public static void main(String[] args) throws Exception {
		Map<String,String> params = Utils.parseParams(args);

		String val = Utils.getString(params, "input", "", true);
        File videoFile = val.isEmpty() ? null : new File(val);

        // if output is empty then use temp file for writing and rename to an output name(=input file)
        val = Utils.getString(params, "output", "", true);
		File outputFile = val.isEmpty() ? videoFile : new File(val);
                
		String mode = Utils.getString(params, "mode", "", true); // remove
		
		if (mode.equalsIgnoreCase("remove")) {
			boolean isModified=removeBox(videoFile, outputFile, params.get("path"));
			System.out.println(isModified ? "Box path removed from file" : "Box path not found");
		} else if (mode.equalsIgnoreCase("keepPSSH")) {
			boolean isModified=keepPSSH(videoFile, outputFile, params.get("drm")); // playready,widevine,marlin,cenc
			System.out.println(isModified ? "PSSH found, removed other atoms" : "PSSH not found");
		} else if (mode.equalsIgnoreCase("setPSSH")) {
			// print Playready and Widevine <ContentProtection> elements
			String kid = Utils.getString(params, "drm.kid", "", true);
			String key = Utils.getString(params, "drm.key", "", true);
			String alg = Utils.getString(params, "drm.mode", "", true); // cenc,cbcs,cbcs0
			
			boolean isOk = Utils.getBoolean(params, "drm.playready", true);
			if (isOk) {
				String url = Utils.getString(params, "drm.playready.laurl", "", true);
				boolean isModified=setPSSH(videoFile, outputFile, DashDRM.PLAYREADY.SYSID, kid, key, url, "", "", alg);
				System.out.println(isModified ? "PSSH found, set pssh" : "PSSH not found");
				System.out.println("");
			}
			
			isOk = Utils.getBoolean(params, "drm.widevine", true);
			if (isOk) {
				String url="";
				boolean isModified=setPSSH(videoFile, outputFile, DashDRM.WIDEVINE.SYSID, kid, key, url
						, Utils.getString(params, "drm.widevine.provider", "", true)
						, Utils.getString(params, "drm.widevine.contentid", "", true)
						, "" );
				System.out.println(isModified ? "PSSH found, set pssh" : "PSSH not found");
				System.out.println("");
			}
		}
	}

	/**
	 * Remove mp4 box from the video file.
	 * @param videoFile		input file.
	 * @param outputFile	output file, this may be equal to videoFile value.
	 * @param boxPath	example "moov/trak/senc", "sgpd-sbgp"
	 * @return	true if file was modified.
	 * @throws IOException
	 */
	public static boolean removeBox(File videoFile, File outputFile, String boxPath) throws IOException {
        if (!videoFile.exists())
            throw new FileNotFoundException(videoFile.getAbsolutePath() + " not found");
        // if input=output then use outputTemp before writing to the destination file
		File outputTemp = videoFile==outputFile || videoFile.getCanonicalFile().equals(outputFile) ?
			new File(outputFile.getParentFile(), outputFile.getName()+"_temp"+System.currentTimeMillis()) : null;
                
        FileInputStream fis = new FileInputStream(videoFile);
        FileOutputStream fos = null;
        IsoFile isoFile = new IsoFile(fis.getChannel());
        
        try {
        	// loop box tree and find target box, remember parent boxlist
        	List<Box> boxes=isoFile.getBoxes(); // parent boxes
        	
        	boolean isModified;        	
        	if (boxPath.equals("sgpd-sbgp")) {
            	// sgpd=SampleGroupDescriptionBox, sbgp=SampleToGroupBox
        		//FIXME: handles only first moof/mdat pair
        		isModified=removeBox(boxes,"moof/traf/sgpd");
        		isModified=removeBox(boxes,"moof/traf/sbgp") | isModified;
        		if (isModified) {
        			// fix dataoffset (mdat.length+type(8b) and optional boxlonglength(8b)
        			long offset=getBox(boxes, "moof", 0).getSize() + 8+(getBox(boxes, "mdat", 0).getSize()==1?8:0);
        			((TrackRunBox)getBox(boxes, "moof/traf/trun", 0)).setDataOffset((int)offset);
        		}
        	} else {
        		isModified=removeBox(boxes, boxPath);
        	} 	

    		// write new file if box tree was modified or inputFile!=outputFile
        	if (isModified || outputTemp==null) {
	    		fos = new FileOutputStream(outputTemp!=null ? outputTemp : outputFile);
	    		isoFile.writeContainer(fos.getChannel());
	    		isoFile.close();
	    		fis.close();
	    		fos.close();
	    		isoFile=null; fis=null; fos=null; // mark we are done with IO files
	    		if (outputTemp!=null) {
	    			outputFile.delete();
	    			outputTemp.renameTo(outputFile);
	    		}
        	}
        	return isModified;
		} finally {
	        if (isoFile!=null) isoFile.close(); // failsafe if exception was thrown
	        if (fis!=null) fis.close();
	        if (fos!=null) fos.close();
		}		
	}
	
	private static boolean removeBox(List<Box> boxes, String boxPath) throws IOException {
      	int foundBoxIdx=-1;

    	boolean removeAll = boxPath.endsWith("[*]"); // "moov/pssh[*]" 
    	if (removeAll) boxPath=boxPath.substring(0, boxPath.length()-3);
    	String[] path = boxPath.toLowerCase(Locale.US).split("\\/");
    	
    	for(int idx=0; idx<path.length; idx++) {
    		Box box=null;
    		for(int idxb=0; idxb<boxes.size(); idxb++) {
    			Box tb = boxes.get(idxb);
    			if (tb.getType().equals(path[idx])) {
    				foundBoxIdx=idxb; // remember idx in this boxlist
    				box=tb;
    				break;
    			}
    		}
    		if (box!=null) {
    			if (idx==path.length-1) {
    				break;
    			} else {
    				foundBoxIdx=-1; // keep finding child box
    				boxes = ((Container)box).getBoxes();
    			}
    		} else {
    			foundBoxIdx=-1;
    			break; // parent box not found
    		}
    	}

    	boolean isModified=false;        	
		if (foundBoxIdx>=0) {
			if (removeAll) {
				String type=boxes.get(foundBoxIdx).getType();
				for(int idx=boxes.size()-1; idx>=0; idx--) {
					if (boxes.get(idx).getType().equals(type))
						boxes.remove(idx);
				}
			} else {
    			boxes.remove(foundBoxIdx);
			}
			isModified=true;    			
		}
		return isModified;
	}
	
	private static Box getBox(List<Box> boxes, String boxPath, int startBoxIdx) throws IOException {
    	String[] path = boxPath.toLowerCase(Locale.US).split("\\/");
    	for(int idx=0; idx<path.length; idx++) {
    		Box box=null;
    		for(int idxb=startBoxIdx; idxb<boxes.size(); idxb++) {
    			Box tb = boxes.get(idxb);
    			if (tb.getType().equals(path[idx])) {
    				box=tb;
    				break;
    			}
    		}
    		if (box==null) break;
    		else if (idx==path.length-1) {
				return box;
			} else {
				boxes = ((Container)box).getBoxes();
				startBoxIdx=0;
			}
    	}
    	return null;
	}	

	/**
	 * Keep given SystemID PSSH and remove the rest.
	 * @param videoFile		input file.
	 * @param outputFile	output file, this may be equal to videoFile value.
	 * @param sysId      System id to keep, playready,marlin,widevine,cenc, 
	 *     special case key "playready,widevine", "playready,widevine,cenc" combo
	 * @return	true if file was modified.
	 * @throws IOException
	 */
	public static boolean keepPSSH(File videoFile, File outputFile, String sysId) throws IOException {
        if (!videoFile.exists())
            throw new FileNotFoundException(videoFile.getAbsolutePath() + " not found");
        // if input=output then use outputTemp before writing to the destination file
		File outputTemp = videoFile==outputFile || videoFile.getCanonicalFile().equals(outputFile) ?
			new File(outputFile.getParentFile(), outputFile.getName()+"_temp"+System.currentTimeMillis()) : null;
                
        FileInputStream fis = new FileInputStream(videoFile);
        FileOutputStream fos = null;
        IsoFile isoFile = new IsoFile(fis.getChannel());
        try {
    		// "playready,widevine", "playready,widevine,cenc", "playready,cenc", "widevine,cenc", "marlin,cenc"
        	List<byte[]> sysIdBytes = new ArrayList<byte[]>(2);
    		String[] tokens = sysId.split("\\,");
    		for(int idx=0; idx<tokens.length; idx++) {
    			if(tokens[idx]==null || tokens[idx].isEmpty()) continue;
    			DashDRM.DRMType drmType = DashDRM.getTypeByName(tokens[idx]);
    			sysIdBytes.add( Utils.hexToBytes(drmType!=null ? drmType.SYSID : tokens[idx]) );
    		}
        	
        	List<Box> boxes=isoFile.getBoxes();
        	Container moov=null;        	
        	for(int idx=0; idx<boxes.size(); idx++) {
        		if (boxes.get(idx).getType().equals("moov")) {
        			moov=(Container)boxes.get(idx);
        			boxes=moov.getBoxes();
        			break;
        		}
        	}

        	boolean isModified=false;
        	if (moov!=null) {
	        	for(int idx=boxes.size()-1; idx>=0; idx--) {
	        		if (!boxes.get(idx).getType().equals("pssh")) continue;
	        		ProtectionSystemSpecificHeaderBox box = (ProtectionSystemSpecificHeaderBox)boxes.get(idx);

	        		boolean isFound=false;
	        		for(int idxL=0; idxL<sysIdBytes.size(); idxL++) {
		        		if (Arrays.equals(sysIdBytes.get(idxL), box.getSystemId())) {
		        			isFound=true;
		        			break;
		        		}
	        		}
	        		if(!isFound) {
	        			boxes.remove(idx);
	        			isModified=true;
	        		}	        		
	        	}
        	}
        	        	
    		// write new file if box tree was modified or inputFile!=outputFile
        	if (isModified || outputTemp==null) {
	    		fos = new FileOutputStream(outputTemp!=null ? outputTemp : outputFile);
	    		isoFile.writeContainer(fos.getChannel());
	    		isoFile.close();
	    		fis.close();
	    		fos.close();
	    		isoFile=null; fis=null; fos=null; // mark we are done with IO files
	    		if (outputTemp!=null) {
	    			outputFile.delete();
	    			outputTemp.renameTo(outputFile);
	    		}
        	}
        	return isModified;
		} finally {
	        if (isoFile!=null) isoFile.close(); // failsafe if exception was thrown
	        if (fis!=null) fis.close();
	        if (fos!=null) fos.close();
		}		
	}

	private static boolean setPSSH(File videoFile, File outputFile, String systemId,
			String kid, String key, String laurl,
			String wvProvider, String wvContentId, String alg) throws Exception {
		boolean isModified=false;
		String b64pssh=null;
		Map<String,String> params=new HashMap<String,String>();
		params.put("drm.kid", kid);
		params.put("drm.key", key);
		params.put("drm.mode", alg);
		
		if (systemId.equalsIgnoreCase(DashDRM.PLAYREADY.SYSID)) {
			params.put("drm.playready", "1");
			params.put("drm.playready.laurl", laurl);
			DashDRM drm= new DashDRM();
			drm.initParams(params);
			byte[] buf = drm.createPlayreadyXML(kid, key, laurl, alg).getBytes("UTF-16LE");
			b64pssh    = drm.createPlayreadyPSSH(buf);
			
			System.out.println("MPD/ContentProtection(Playready):");
			System.out.println(drm.createPlayreadyMPDElement("video"));
		} else if (systemId.equalsIgnoreCase(DashDRM.WIDEVINE.SYSID)) {
			// todo: does not modify yet, just printout
			params.put("drm.widevine", "1");
			params.put("drm.widevine.provider", wvProvider);
			params.put("drm.widevine.contentid", wvContentId);
			DashDRM drm= new DashDRM();
			drm.initParams(params);
			System.out.println("MPD/ContentProtection(Widevine):");
			System.out.println(drm.createWidevineMPDElement("video"));
			return false;
		}

		System.out.println("PSSH ("+systemId+"):");		
		System.out.println(b64pssh); // this is a full PSSH in base64 encoding
		
		System.out.println(String.format("LaUrl  : %s", laurl ));
		String val = params.get("drm.kid");
		if(val.startsWith("0x")) val=val.substring(2);
		System.out.println(String.format("KidGUID: %s-%s-%s-%s-%s" 
			, val.substring(0,8), val.substring(8,12), val.substring(12,16)
			, val.substring(16,20), val.substring(20) ));
		System.out.println(String.format("KidHex : %s", val ));
		val = params.get("drm.key");
		if(val.startsWith("0x")) val=val.substring(2);
		System.out.println(String.format("KeyHex : %s", val ));
		System.out.println(String.format("KeyB64 : %s", Utils.base64Encode(Utils.hexToBytes(val)) ));

		//https://test.playready.microsoft.com/service/rightsmanager.asmx?cfg=(kid:header,sl:2000,persist:false,contentkey:EjQSNBI0EjQSNBI0VFJJNA==)
		System.out.println(String.format("MSTest : https://test.playready.microsoft.com/service/rightsmanager.asmx?cfg=(kid:header,sl:2000,persist:false,contentkey:%s)"
				, Utils.base64Encode(Utils.hexToBytes(val))) );
		
		if (videoFile==null || b64pssh==null)
			return isModified;
        if (!videoFile.exists())
            throw new FileNotFoundException(videoFile.getAbsolutePath() + " not found");
        
        // if input=output then use outputTemp before writing to the destination file
		File outputTemp = videoFile==outputFile || videoFile.getCanonicalFile().equals(outputFile) ?
			new File(outputFile.getParentFile(), outputFile.getName()+"_temp"+System.currentTimeMillis()) : null;

        FileInputStream fis = new FileInputStream(videoFile);
        FileOutputStream fos = null;
        IsoFile isoFile = new IsoFile(fis.getChannel());
        try {
        	List<Box> boxes=isoFile.getBoxes();
        	for(int idx=0; idx<boxes.size(); idx++) {
        		if (boxes.get(idx).getType().equals("moov")) {
        			Container moov=(Container)boxes.get(idx);
        			boxes=moov.getBoxes(); // MOOV/MVHD|MVEX|TRAK|PSSH|PSSH|PSSH|..
        			break;
        		}
        	}

        	byte[] systemIdBytes=Utils.hexToBytes(systemId);
    		for(int idx=boxes.size()-1; idx>=0; idx--) {
        		if (!boxes.get(idx).getType().equals("pssh")) continue;
        		// drop "len,pssh,systemid,len" leading bytes from full pssh
        		ProtectionSystemSpecificHeaderBox box = (ProtectionSystemSpecificHeaderBox)boxes.get(idx);
        		if (!Arrays.equals(systemIdBytes, box.getSystemId())) continue;
        		box.setContent( Utils.trimArray(Utils.base64Decode(b64pssh), 4+24+4, 0) );
        		isModified=true;
        		break;
        	}
        	
    		// write new file if box tree was modified or inputFile!=outputFile
        	if (isModified || outputTemp==null) {
	    		fos = new FileOutputStream(outputTemp!=null ? outputTemp : outputFile);
	    		isoFile.writeContainer(fos.getChannel());
	    		isoFile.close();
	    		fis.close();
	    		fos.close();
	    		isoFile=null; fis=null; fos=null; // mark we are done with IO files
	    		if (outputTemp!=null) {
	    			outputFile.delete();
	    			outputTemp.renameTo(outputFile);
	    		}
        	}
        	return isModified;
		} finally {
	        if (isoFile!=null) isoFile.close(); // failsafe if exception was thrown
	        if (fis!=null) fis.close();
	        if (fos!=null) fos.close();
		}		
	}
	
}
