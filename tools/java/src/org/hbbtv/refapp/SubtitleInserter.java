package org.hbbtv.refapp;

import java.io.*;
import java.util.*;

/**
 * Insert subtitle descriptor to manifest.
 *
 * Insert subtitle(out-of-band), copy input file to manifest output folder.
 *   java -cp "./lib/*" org.hbbtv.refapp.SubtitleInserter mode=ob input=/input/sub_fin.xml lang=fin copyinput=1 manifest=/dash/manifest.mpd output=/dash/manifest_subob.mpd
 *   
 * Insert subtitle(inband), split to /dash/sub_xxx/sub_x.m4s segment files.
 *   java -cp "./lib/*" org.hbbtv.refapp.SubtitleInserter mode=ib input=/input/sub_fin.xml lang=fin copyinput=1 manifest=/dash/manifest.mpd output=/dash/manifest_subib.mpd config=dasher.properties 
 */
public class SubtitleInserter {
	
	public static void main(String[] args) throws Exception {
		Map<String,String> params = Utils.parseParams(args);

        File subFile = new File(params.get("input"));
        
        File manifestFile = new File(params.get("manifest")); // input manifest.mpd
        if (!manifestFile.exists())
        	throw new FileNotFoundException(manifestFile.getAbsolutePath() + " not found");

        String val = Utils.getString(params, "output", "", true); // output manifest_subob.mpd
        File outputFile = val.isEmpty() ? manifestFile : new File(val);
        
		String mode = Utils.getString(params, "mode", "ob", true); // ob=out-of-band, ib=inband
		if (mode.equalsIgnoreCase("ob")) {
			// out-of-band subtitle is a xml-file link in a manifest file.
			insertOB(
				subFile, manifestFile, outputFile,
				params.get("lang"), // fin,eng,..
				Utils.getBoolean(params, "copyinput", false) );
		} else if (mode.equalsIgnoreCase("ib")) {
			// inband requires config=config.properties input parameter,
			// xml file is splitted to segment files.
			MediaTools.initTools(params.get("tool.ffmpeg"), params.get("tool.mp4box"));
			insertIB(
				subFile, manifestFile, outputFile,
				params.get("lang"),  // fin,eng,..
				Utils.getBoolean(params, "copyinput", false), // split ttml.xml to segment files
				(int)Utils.getLong(params, "segdur", 6) ,
				Utils.getBoolean(params, "deletetempfiles", true),
				Utils.getString(params, "urlprefix", "", true) ); // "../" for drm/manifest.mpd file
		}		
	}

	/**
	 * Insert subtitle (out-of-band) to manifest file.
	 * @param subFile		input ttml.xml file (/input/sub_eng.xml)
	 * @param manifestFile	manifest to be modified
	 * @param outputFile	output manifest
	 * @param lang			adaptationset.lang attribute value (eng,fin,swe,..)
	 * @param copyInput		copy subtitle file to manifest output folder
	 * @throws Exception
	 */
	private static void insertOB(File subFile, File manifestFile, File outputFile,
			String lang, boolean copyInput) throws Exception {
		String filename=subFile.getName(); // sub_fin.xml
		String id = filename.substring(0, filename.lastIndexOf('.')); // sub_fin

		if (copyInput) {
			if (!subFile.exists())
				throw new FileNotFoundException(subFile.getAbsolutePath() + " not found");
			Utils.copyFile(subFile, new File(outputFile.getParentFile(), filename) );
		} else {
			filename = subFile.getPath().replace('\\', '/'); // use "../sub_fin.xml" as-is
		}

		String template=Utils.NL+Utils.NL+"  <AdaptationSet contentType=\"text\" mimeType=\"application/ttml+xml\" lang=\"${lang}\">"+Utils.NL
			+"    <Role schemeIdUri=\"urn:mpeg:dash:role:2011\" value=\"subtitle\"/>"+Utils.NL 
			+"    <Representation id=\"${id}\" bandwidth=\"3000\">"
			+"<BaseURL>${file}</BaseURL></Representation>"+Utils.NL
			+"  </AdaptationSet>"+Utils.NL;  
		template=template.replace("${lang}", lang)
				.replace("${id}", id)
				.replace("${file}", filename);
		
		StringBuilder data = Utils.loadTextFile(manifestFile, "UTF-8"); 
		int startIdx = data.lastIndexOf("</AdaptationSet>");
		if (startIdx<0) throw new IllegalArgumentException("AdaptationSet not found in manifest");
		data.insert(startIdx+16, template);

		Utils.saveFile(outputFile, data.toString().getBytes("UTF-8"));
	}
	
	/**
	 * Insert subtitle (inband) to manifest file, split input ttml.xml to segment files.
	 * @param subFile		input ttml.xml file (/input/sub_eng.xml)
	 * @param manifestFile	manifest to be modified
	 * @param outputFile	output manifest
	 * @param lang			adaptationset.lang attribute value (eng,fin,swe,..)
	 * @param createSegs	create sub_lang/sub_x.m4s segment files
	 * @param segdur		segment duration (seconds)
	 * @param deletetempfiles  delete temporary files
	 * @param urlPrefix		segment template init+media templates (../ for drm manifest.mpd file)
	 * @param
	 * @throws Exception
	 */
	private static void insertIB(File subFile, File manifestFile, File outputFile,
			String lang, boolean createSegs, int segdur,
			boolean deletetempfiles, String urlPrefix) throws Exception {
		String filename=subFile.getName(); // sub_fin.xml
		String id = filename.substring(0, filename.lastIndexOf('.')); // sub_fin

		if (createSegs) {
			if (!subFile.exists())
				throw new FileNotFoundException(subFile.getAbsolutePath() + " not found");
		} else {
			filename = subFile.getPath().replace('\\', '/'); // use "../sub_fin.xml" as-is
		}

		if (createSegs) {
			File outputFolder = outputFile.getParentFile();

			// delete old files from output folder (output/sub_xxx/*)
			Dasher.deleteOldFiles(new File(outputFolder, id+"/") );
			File tempOutput=new File(outputFolder, "temp-"+id+".mp4");
			tempOutput.delete();
			
			// create fragmented output/temp-sub_xxx.mp4 from sub_xxx.xml text file
			List<String> args=MediaTools.getSubIBTempMp4Args(subFile, tempOutput, id); 
			MediaTools.executeProcess(args, outputFolder);
			new File(outputFolder, id+"/").mkdir();
			// create output/sub_xxx/sub_x.m4s segment files
			args=MediaTools.getSubIBSegmentsArgs(tempOutput, id, segdur);
			MediaTools.executeProcess(args, new File(outputFolder, id+"/") );
		}
		
		String template=Utils.NL+Utils.NL+"  <AdaptationSet segmentAlignment=\"true\" lang=\"${lang}\" contentType=\"text\" mimeType=\"application/mp4\">"+Utils.NL
			+"    <Role schemeIdUri=\"urn:mpeg:dash:role:2011\" value=\"subtitle\"/>"+Utils.NL
			+"    <SegmentTemplate initialization=\"${file}$RepresentationID$/sub_i.mp4\" media=\"${file}$RepresentationID$/sub_$Number$.m4s\" timescale=\"1000\" startNumber=\"1\" duration=\"${dur}\"/>"+Utils.NL
			+"    <Representation id=\"${id}\" startWithSAP=\"1\" bandwidth=\"6000\" codecs=\"stpp\"></Representation>"+Utils.NL
			+"  </AdaptationSet>"+Utils.NL;
		template=template.replace("${lang}", lang)
				.replace("${id}", id)
				.replace("${file}", urlPrefix)
				.replace("${dur}", ""+(segdur*1000));
		
		StringBuilder data = Utils.loadTextFile(manifestFile, "UTF-8"); 
		int startIdx = data.lastIndexOf("</AdaptationSet>");
		if (startIdx<0) throw new IllegalArgumentException("AdaptationSet not found in manifest");
		data.insert(startIdx+16, template);

		Utils.saveFile(outputFile, data.toString().getBytes("UTF-8"));
		
		if (createSegs && deletetempfiles) {
			File outputFolder = outputFile.getParentFile();
			new File(outputFolder, "temp-"+id+".mpd").delete();
			new File(outputFolder, "temp-"+id+".mp4").delete();
		}		
	}
			
}
