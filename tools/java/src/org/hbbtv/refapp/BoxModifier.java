package org.hbbtv.refapp;

import java.io.*;

import java.util.*;
import org.mp4parser.IsoFile;
import org.mp4parser.Box;
import org.mp4parser.Container;

/**
 * Modify init.mp4 or seg.m4s MP4 boxes(=tables).
 *
 * Remove SENC box:
 *   java -cp "./lib/*" org.hbbtv.refapp.BoxModifier input=dash/v1_i.mp4 mode=remove path=moov/trak/senc
 * Remove all PSSH boxes:
 *   java -cp "./lib/*" org.hbbtv.refapp.BoxModifier input=dash/v1_i.mp4 mode=remove path=moov/pssh[*] output=dash/v1_i_nopssh.mp4
 */
public class BoxModifier {

	public static void main(String[] args) throws Exception {
		Map<String,String> params = Utils.parseParams(args);

        File videoFile = new File(params.get("input"));

        // if output is empty then use temp file for writing and rename to an output name
        String val = Utils.getString(params, "output", "", true);
		File outputFile = val.isEmpty() ? videoFile : new File(val);
                
		String mode = Utils.getString(params, "mode", "", true); // remove
		
		if (mode.equalsIgnoreCase("remove")) {
			boolean isModified=removeBox(videoFile, outputFile, params.get("path") );
			System.out.println(isModified ? "Box path removed from file" : "Box path not found");
		}
	}

	/**
	 * Remove mp4 box from the video file.
	 * @param videoFile		input file.
	 * @param outputFile	output file, this may be equal to videoFile value.
	 * @param boxPath	example "moov/trak/senc"
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
        	int foundBoxIdx=-1;
        	List<Box> boxes=isoFile.getBoxes(); // parent boxes

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
