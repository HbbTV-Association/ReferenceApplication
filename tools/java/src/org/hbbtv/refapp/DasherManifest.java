package org.hbbtv.refapp;

import java.io.*;
import java.util.*;

/**
 * Modify manifest.mpd file
 * - drop Representation
 * - drop AdaptationSet
 * - insert ContentProtection
 * 
 java -cp "./lib/*" org.hbbtv.refapp.DasherManifest \ 
   input="manifest.mpd" output="manifest_v1v2v3_a1.mpd" \ 
   item.1="v4 video lang=* cmd=removerep" item.2="* audio lang=fin,ger,swe cmd=removerep"
 java -cp "./lib/*" org.hbbtv.refapp.DasherManifest \ 
   input="manifest.mpd" output="manifest_max1080p.mpd" \ 
   item.1="* video maxheight=1080 cmd=removerep" 
 *
 */
public class DasherManifest {
	private static LogWriter logger;
	
	public static void setLogger(LogWriter lw) {
		logger = lw;
	}
	
	public static void main(String[] args) throws Exception {
		Map<String,String> params = Utils.parseParams(args);

		String val = Utils.getString(params, "logfile", "", true);
		logger = new LogWriter();
		logger.openFile(val.isEmpty() ? null : new File(val), true); // append to a logfile
		logger.println(Utils.getNowAsString() + " Start manifest generator");
		
		logger.println("Parameters:");
		for(String key : new TreeSet<String>(params.keySet()) )
			logger.println(key+"="+params.get(key));
		logger.println("");
		
		MediaTools.initParams(params); // init default values		
		
		File inputFile = new File(params.get("input"));
        if (!inputFile.exists())
            throw new FileNotFoundException(inputFile.getAbsolutePath() + " not found");
		
        val = Utils.getString(params, "output", "", true);
		File outputFile = val.isEmpty() ? inputFile : new File(val);

		DashManifest manifest = new DashManifest(inputFile);

		// one or more items to be processed on the same manifest
		// note: for now "token0 token1 any=thing" two leading tokens are mandatory on each cmd
		Map<String,String> itemArgs = new HashMap<String,String>(4);
		for(int idx=1; ; idx++) {
			String item = Utils.getString(params, "item."+idx, "", true);
			if(item.isEmpty()) break;
			else if(item.startsWith("disable")) continue;
			
			logger.println("item."+idx+"="+item);
			itemArgs.clear();
			String[] tokens= item.split("\\s* \\s*");
			String repId   = tokens[0].trim();  // "v3,v4" or "*"
			String mime    = tokens[1].trim();  // filter: "video","audio" or "*"
			for(int idxI=2; idxI<tokens.length; idxI++) {
				int delim=tokens[idxI].indexOf('=');
				if(delim>0)
					itemArgs.put( tokens[idxI].substring(0,delim).trim(), tokens[idxI].substring(delim+1).trim() );
			}
			
			String cmd = Utils.getString(itemArgs, "cmd", "", true);
			if(cmd.equalsIgnoreCase("removeRep")) {
				// item.1="v4 video lang=* cmd=removerep" item.2="* audio lang=fin,ger,swe cmd=removerep"
				manifest.removeRepresentation(
					repId, mime,
					Utils.getString(itemArgs, "lang", "", true),   // filter: "fin,swe" or empty
					(int)Utils.getLong(itemArgs, "maxheight", -1)  // filter: 1080=keep <=1080 resolutions 
				);
				
			} else if(cmd.equalsIgnoreCase("setDRM")) {
				// item.1="* video cmd=setdrm" item.2="* audio cmd=setdrm"
				DashDRM drm = new DashDRM();
				drm.initParams(params);

				String xml = drm.createPlayreadyMPDElement(mime);
				if(!xml.isEmpty()) {
					manifest.removeContentProtectionElement(mime, DashDRM.PLAYREADY.NAME);
					manifest.addContentProtectionElement(mime, xml);										
				}
				
				xml = drm.createWidevineMPDElement(mime);
				if(!xml.isEmpty()) {
					manifest.removeContentProtectionElement(mime, DashDRM.WIDEVINE.NAME);
					manifest.addContentProtectionElement(mime, xml);										
				}

				xml = drm.createClearKeyMPDElement();
				if(!xml.isEmpty()) {
					manifest.removeContentProtectionElement(mime, DashDRM.CLEARKEY.NAME);
					manifest.addContentProtectionElement(mime, xml);										
				}
			}
		}
		
		manifest.save(outputFile, true);
		logger.println(Utils.getNowAsString() + " input=" + Utils.normalizePath(inputFile.getAbsolutePath(), true));
		logger.println(Utils.getNowAsString() + " output=" + Utils.normalizePath(outputFile.getAbsolutePath(), true));
		logger.println(Utils.getNowAsString() + " Completed manifest generator");
	}
	
}
