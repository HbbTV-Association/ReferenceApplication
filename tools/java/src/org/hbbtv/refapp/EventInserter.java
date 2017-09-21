package org.hbbtv.refapp;

import java.io.*;
import java.util.*;
import org.mp4parser.IsoFile;
import org.mp4parser.boxes.iso23009.part1.EventMessageBox;
import org.mp4parser.Box;

/**
 * Insert EventMessageBox(EMSG) to mp4 segment.
 * Remove existing EMSG boxes from file.
 * Modify manifest.mpd file.
 *
 * Insert EMSG to segment file:
 *   java -cp "./lib/*" org.hbbtv.refapp.EventInserter input=dash/v1_1.m4s scheme="urn:my:scheme" value="1" ts=1 ptd=1 dur=0xFFFF id=1 msg="any payload"
 * Remove all EMSG boxes from segment file:
 *   java -cp "./lib/*" org.hbbtv.refapp.EventInserter input=dash/v1_1.m4s scheme=""
 *   
 * Insert InbandEventStream element to mpd manifest 
 *   java -cp "../lib/*" org.hbbtv.refapp.EventInserter mode=mpd input="dash/manifest.mpd" scheme="urn:my:scheme" value="1"
 * Remove all InbandEventStream elements from mpd manifest 
 *   java -cp "../lib/*" org.hbbtv.refapp.EventInserter mode=mpd input="dash/manifest.mpd" scheme=""
 */
public class EventInserter {

	public static void main(String[] args) throws Exception {
		Map<String,String> params = Utils.parseParams(args);

        File videoFile = new File(params.get("input"));
        if (!videoFile.exists())
            throw new FileNotFoundException(videoFile.getAbsolutePath() + " not found");

		String mode = Utils.getString(params, "mode", "", true);
		if (mode.equalsIgnoreCase("mpd")) {
			// add <InbandEventStream..> to manifest, or delete from manifest
			doMPD(videoFile, params);
			return;
		}
        
		// mode=emsg (EMSG inserter, EMSG delete)
		
        // if output is empty then use temp file for writing and rename to an output name
        String val = Utils.getString(params, "output", "", true);
		File outputFile = val.isEmpty() ? videoFile : new File(val);
		File outputTemp = videoFile.getCanonicalFile().equals(outputFile) ?
			new File(outputFile.getParentFile(), outputFile.getName()+"_temp"+System.currentTimeMillis()) : null;
		
        FileInputStream fis = new FileInputStream(videoFile);
        FileOutputStream fos = null;
        IsoFile isoFile = new IsoFile(fis.getChannel());
        try {
        	//Box box = Path.getPath(isoFile, "moov[0]/trak[0]/mdia[0]/hdlr[0]");
        	//System.out.println(box!=null ?  box.getType() + ", " + box.getSize() : "NULL");
        	
        	boolean isModified=false;

        	// find index of MOOF and first EMSG box
        	List<Box> boxes=isoFile.getBoxes();
        	int moofIdx=-1, emsgIdx=-1;
        	for(int idx=0; idx<boxes.size(); idx++) {
        		Box box = boxes.get(idx);
        		if (box.getType().equals("moof")) {
        			moofIdx=idx;
        		} else if (emsgIdx<0 && box.getType().equals("emsg")) {
        			emsgIdx=idx;
        		}
        	}

        	// drop existing EMSG boxes, adjust MOOF index accordingly
        	if (emsgIdx>=0 && Utils.getBoolean(params, "deleteemsg", true) ) {
        		for(int idx=boxes.size()-1; idx>=emsgIdx; idx--) {
        			if (boxes.get(idx).getType().equals("emsg")) {
        				System.out.println("Dropping EMSG index " + idx);        				
        				boxes.remove(idx);
        				if (idx<moofIdx) moofIdx--;
        				isModified=true;        				
        			}
        		}
        	}

        	// insert new box before MOOF box, if scheme="" then do not add EMSG box,
        	// params may use a hexstring (0x646566) or plain string format
        	
        	val = Utils.getString(params, "scheme", "", true); // same as <InbandEventStream value="x"..>
        	if (val.startsWith("0x")) val=new String(Utils.hexToBytes(val.substring(2)), "UTF-8");            	
        	String scheme = val; // "urn:mpeg:dash:event:2012" or something else
        	
        	if (moofIdx>=0 && !scheme.isEmpty()) {
            	EventMessageBox emsg = new EventMessageBox();
            	emsg.setVersion(0);
            	emsg.setFlags(0);
            	emsg.setSchemeIdUri(scheme);
            	
            	val = Utils.getString(params, "value", "", true); // same as <InbandEventStream value="x"..>
            	emsg.setValue( val.startsWith("0x") ? 
            		new String(Utils.hexToBytes(val.substring(2)), "UTF-8") : val );
            	
            	val = Utils.getString(params, "ts", "1", true);
            	emsg.setTimescale( val.startsWith("0x") ? 
            		Long.parseLong(val.substring(2), 16) : Long.parseLong(val) );
            	            	
            	val = Utils.getString(params, "ptd", "1", true);
            	emsg.setPresentationTimeDelta( val.startsWith("0x") ? 
            		Long.parseLong(val.substring(2), 16) : Long.parseLong(val) );

            	val = Utils.getString(params, "dur", "1", true);  // 0x0000FFFF=65535
            	emsg.setEventDuration( val.startsWith("0x") ? 
            		Long.parseLong(val.substring(2), 16) : Long.parseLong(val) );

            	val = Utils.getString(params, "id", "1", true);
            	emsg.setId( val.startsWith("0x") ? 
            		Long.parseLong(val.substring(2), 16) : Long.parseLong(val) );

            	val = Utils.getString(params, "msg", "1", true);  // "This is an EMSG event (value=1, id=1)"
            	emsg.setMessageData( val.startsWith("0x") ?
            		Utils.hexToBytes(val) : val.getBytes("UTF-8") );
            	
        		boxes.add(moofIdx, emsg);
        		isoFile.setBoxes(boxes);
        		isModified=true;        		
        	}

        	if (isModified) {
	    		System.out.println("Writing a new file " + outputFile.getAbsolutePath());
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
        	
		} finally {
	        if (isoFile!=null) isoFile.close(); // failsafe if exception was thrown
	        if (fis!=null) fis.close();
	        if (fos!=null) fos.close();
		}
	}

	private static void doMPD(File manifestFile, Map<String,String> params) throws Exception {
		// <InbandEventStream schemeIdUri="http://hbbtv.org/refapp" value="1"/>
		String val = Utils.getString(params, "output", "", true);
		File outputFile = val.isEmpty() ? manifestFile : new File(val);

		val = Utils.getString(params, "scheme", "", true);
    	if (val.startsWith("0x")) val=new String(Utils.hexToBytes(val.substring(2)), "UTF-8");            	
    	String scheme = val; // "urn:mpeg:dash:event:2012" or something else

    	val = Utils.getString(params, "value", "", true); // same as <InbandEventStream value="x"..>
    	val = val.startsWith("0x") ? 
    		new String(Utils.hexToBytes(val.substring(2)), "UTF-8") : val;
    		
    	DashManifest manifest = new DashManifest(manifestFile);
    	if (!scheme.isEmpty()) {
    		// add element to AdaptationSet(video) block 
    		manifest.addInbandEventStreamElement(scheme, val, "video");
    		manifest.save(outputFile);
    	} else {
    		manifest.removeInbandEventStreamElement(null, null);
    		manifest.save(outputFile);
    	}
	}

	
}
