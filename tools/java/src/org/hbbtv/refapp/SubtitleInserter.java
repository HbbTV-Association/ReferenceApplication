package org.hbbtv.refapp;

import java.io.*;
import java.util.*;

/**
 * Insert subtitle descriptor to a manifest.
 *
 * Insert subtitle(out-of-band), copy input file to manifest output folder.
 *   java -cp "./lib/*" org.hbbtv.refapp.SubtitleInserter mode=ob input=/input/sub_fin.xml lang=fin copyinput=1 manifest=/dash/manifest.mpd output=/dash/manifest_subob.mpd
 *   
 * Insert subtitle(inband), split to /dash/sub_xxx/sub_x.m4s segment files.
 *   java -cp "./lib/*" org.hbbtv.refapp.SubtitleInserter mode=ib input=/input/sub_fin.xml lang=fin copyinput=1 manifest=/dash/manifest.mpd output=/dash/manifest_subib.mpd config=dasher.properties 
 */
public class SubtitleInserter {
	private static LogWriter logger;
	
	public static void setLogger(LogWriter lw) {
		logger = lw;
	}
	
	public static void main(String[] args) throws Exception {
		Map<String,String> params = Utils.parseParams(args);
		MediaTools.initTools(params.get("tool.ffmpeg"), params.get("tool.mp4box"));
		MediaTools.initParams(params); // init default values		

        File subFile = new File(params.get("input"));
        
        File manifestFile = new File(params.get("manifest")); // input manifest.mpd
        if (!manifestFile.exists())
        	throw new FileNotFoundException(manifestFile.getAbsolutePath() + " not found");

        String val = Utils.getString(params, "output", "", true); // output manifest_subob.mpd
        File outputFile = val.isEmpty() ? manifestFile : new File(val);
        
		// temp folder for temp-v1.mp4(transcoded) intermediate files
		File tempFolder;
		val = Utils.getString(params, "tempfolder", "", true);
		if(val.isEmpty()) {
			tempFolder = outputFile.getParentFile();
		} else {
			if (!val.endsWith("/")) val+="/";
			tempFolder = new File(val);
		}
		tempFolder.mkdirs();
        
        
		String mode = Utils.getString(params, "mode", "ob", true); // ob=out-of-band, ib=inband
		if (mode.equalsIgnoreCase("ob")) {
			// out-of-band subtitle is a xml-file link in a manifest file.
			insertOB(
				subFile, manifestFile, outputFile,
				params.get("lang"), // fin,eng,..
				"sub_"+params.get("lang"), // "sub_fin" representation id
				(int)Utils.getLong(params, "asid", 51),
				Utils.getBoolean(params, "copyinput", false),
				""
				);
		} else if (mode.equalsIgnoreCase("ib")) {
			// inband requires config=config.properties input parameter,
			// xml file is splitted to segment files.
			insertIB(
				subFile, manifestFile, outputFile,
				tempFolder,
				params.get("lang"),  // fin,eng,..
				"sub_"+params.get("lang"), // "sub_fin" representation id
				(int)Utils.getLong(params, "asid", 51),
				Utils.getBoolean(params, "copyinput", false), // split ttml.xml to segment files
				(int)Utils.getLong(params, "segdur", 8000),
				Utils.getBoolean(params, "deletetempfiles", true),
				Utils.getString(params, "urlprefix", "", true),
				"", false,
				Utils.getString(params, "segname", "number", true),
				Utils.getLong(params, "timelimit", -1) // read X seconds from start
				); // "../" for drm/manifest.mpd file
		}	
	}

	/**
	 * Insert subtitle (out-of-band) to manifest file.
	 * @param subFile		input ttml.xml file (/input/sub_eng.xml)
	 * @param manifestFile	manifest to be modified
	 * @param outputFile	output manifest
	 * @param lang			adaptationset.lang attribute value (eng,fin,swe,..)
	 * @param repId			representation id sub_eng
	 * @param asId			AdaptationSet@id
	 * @param copyInput		copy subtitle file to manifest output folder
	 * @param urlPrefix		segment template init+media templates (../ for drm manifest.mpd file)
	 * @throws Exception
	 */
	public static void insertOB(File subFile, File manifestFile, File outputFile,
			String lang, String repId, int asId, boolean copyInput, String urlPrefix) throws Exception {
		String filename=repId+".xml";
		if (copyInput) {
			if (!subFile.exists())
				throw new FileNotFoundException(subFile.getAbsolutePath() + " not found");
			File subFileOut=new File(outputFile.getParentFile(), filename);
			if (!subFile.getCanonicalFile().equals(subFileOut))
				Utils.copyFile(subFile, subFileOut);
			filename = subFileOut.getName();
		}

		String template=Utils.NL+Utils.NL+"  <AdaptationSet id=\""+asId+"\" contentType=\"text\" mimeType=\"application/ttml+xml\" lang=\"${lang}\">"+Utils.NL
			+"    <Role schemeIdUri=\"urn:mpeg:dash:role:2011\" value=\"main\"/>"+Utils.NL  // subtitle,captions,main
			+"    <Representation id=\"${id}\" bandwidth=\"3000\">"
			+"<BaseURL>${file}</BaseURL></Representation>"+Utils.NL
			+"  </AdaptationSet>"; //+Utils.NL;  
		template=template.replace("${lang}", lang)
				.replace("${id}", repId)
				.replace("${file}", urlPrefix+filename);
		
		if(manifestFile.exists()) {
			StringBuilder data = Utils.loadTextFile(manifestFile, "UTF-8"); 
			int startIdx = data.lastIndexOf("</AdaptationSet>");
			if (startIdx<0) throw new IllegalArgumentException("AdaptationSet not found in manifest");
			data.insert(startIdx+16, template);
			Utils.saveFile(outputFile, data.toString().getBytes("UTF-8"));
		}
	}
	
	/**
	 * Insert subtitle (inband) to manifest file, split input ttml.xml to segment files.
	 * @param subFile		input ttml.xml file (/input/sub_eng.xml)
	 * @param manifestFile	manifest to be modified
	 * @param outputFile	output manifest (destination)
	 * @param tempFolder    use temp folder for "temp-sub_eng.mp4" file
	 * @param lang			adaptationset.lang attribute value (eng,fin,swe,..)
	 * @param repId			representation id sub_eng
	 * @param asId			adaptationset id 31..n			
	 * @param createSegs	create sub_lang/sub_x.m4s segment files
	 * @param segdur		segment duration (millis, 3840, 8000)
	 * @param deletetempfiles  delete temporary files
	 * @param urlPrefix		url prefix for init+media files, use "../" for drm manifests
	 * @param isSingleSeg   use single segment(not implemented yet)
	 * @param segname		number,time,number-timeline,time-timeline
	 * @param timeLimit		seconds of subtitle track to read or -1 to read a full ttml file
	 * @throws Exception
	 */
	public static void insertIB(File subFile, File manifestFile, File outputFile,
			File tempFolder,
			String lang, String repId, int asId, boolean createSegs, int segdur,
			boolean deletetempfiles, String urlPrefix,
			String cmaf, boolean isSingleSeg,
			String segname, long timeLimit) throws Exception {
		if (createSegs) {
			if (!subFile.exists())
				throw new FileNotFoundException(subFile.getAbsolutePath() + " not found");
		}
		segname = segname.toLowerCase(Locale.US);

		File mpdFile;
		if (createSegs) {
			File outputFolder = outputFile.getParentFile();

			// delete old files from output folder (output/sub_xxx/*)
			Dasher.deleteOldFiles(new File(outputFolder, repId+"/"), true);
			File tempOutput=new File(tempFolder, "temp-"+repId+".mp4");
			tempOutput.delete();
			
			// create fragmented output/temp-sub_xxx.mp4 from sub_xxx.xml text file
			List<String> args=MediaTools.getSubIBTempMp4Args(subFile, tempOutput, lang);
			if(logger!=null) logger.println(Utils.getNowAsString()+" "+ Utils.implodeList(args, " "));
			MediaTools.executeProcess(args, tempOutput.getParentFile());
			if (timeLimit>0) {
				args=MediaTools.getTrimMp4Args(tempOutput, tempOutput, timeLimit); 
				if(logger!=null) logger.println(Utils.getNowAsString()+" "+ Utils.implodeList(args, " "));
				MediaTools.executeProcess(args, tempOutput.getParentFile());
			}
			
			// create output/sub_xxx/sub_x.m4s segments from output/temp-sub_xxx.mp4 temp file
			new File(outputFolder, repId+"/").mkdir();
			args=MediaTools.getSubIBSegmentsArgs(tempOutput, repId, segdur, segname, 
					cmaf, isSingleSeg);
			if(logger!=null) logger.println(Utils.getNowAsString()+" "+ Utils.implodeList(args, " "));
			MediaTools.executeProcess(args, outputFolder);

			// copy "output/temp-sub_xxx.mpd" to temp folder
			tempOutput  = new File(outputFolder, args.get( args.indexOf("-out")+1 ));
			mpdFile= new File(tempFolder, tempOutput.getName());
			Utils.moveFile(tempOutput, mpdFile);
		} else {
			mpdFile = new File(tempFolder, "temp-"+repId+".mpd"); // reuse an existing "temp-sub_fin.mpd" template file
		}

		// read everything inside <AdaptationSet>..</AdaptationSet>
		StringBuilder data = Utils.loadTextFile(mpdFile, "UTF-8");
		int startIdx = data.indexOf("<AdaptationSet ");
		startIdx     = data.indexOf(">", startIdx)+1;
		String asData= data.substring(startIdx, data.indexOf("</AdaptationSet")).trim();
		if(!urlPrefix.isEmpty())
			asData = asData.replace("$RepresentationID$/", urlPrefix+"$RepresentationID$/"); // drm manifest uses "../sub_eng/" path

		// mimeType is in Representation field (mimeType="application/mp4")
		// captions=viewers who cannot hear audio(transcription of dialog), subtitles=speakers or any language to watch video
		StringBuilder sbuf = new StringBuilder(8048); 
		sbuf.append(Utils.NL+Utils.NL);
		sbuf.append("  <AdaptationSet id=\""+asId+"\" contentType=\"text\" lang=\""+lang+"\" segmentAlignment=\"true\" startWithSAP=\"1\">"+Utils.NL);
		sbuf.append("    <Role schemeIdUri=\"urn:mpeg:dash:role:2011\" value=\"main\"/>"+Utils.NL );  // subtitle,captions,main
		sbuf.append("    "+asData+Utils.NL);
		sbuf.append("  </AdaptationSet>"); //+Utils.NL);

		// insert subtitle <AS> to "manifest_subib.mpd"
		if(manifestFile.exists()) {
			data = Utils.loadTextFile(manifestFile, "UTF-8"); 
			startIdx = data.lastIndexOf("</AdaptationSet>");
			if (startIdx<0) throw new IllegalArgumentException("AdaptationSet not found in manifest");
			data.insert(startIdx+16, sbuf.toString());
			Utils.saveFile(outputFile, data.toString().getBytes("UTF-8"));
		}
		
		if (createSegs && deletetempfiles)
			new File(tempFolder, "temp-"+repId+".mp4").delete(); // keep "temp-sub_xxx.mpd" for later use (nodrm,drm)
	}
			
}
