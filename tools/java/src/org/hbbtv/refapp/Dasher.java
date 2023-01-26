package org.hbbtv.refapp;

import java.util.*;
import java.io.*;

/**
 * MAIN CLASS: Transcode, Dash, DashEncrypt input video file.
 * Example command, output if current working directory:
 *   java -jar /refapp/lib/dasher.jar config=dasher.properties logfile=/videos/file1/manifest-log.txt drm.kid=rng drm.key=rng input=/videos/file1.mp4 output=/videos/file1/
 *
 * FIXME: mode=dash only without transcoding, do not delete temp if it's a source file, ..
 * FIXME: Use EventInserter to put mdpEvent+segEvent on given timestamps or segnumber
 * FIXME: Audio only manifest?
 * FIXME: define input videoIndex+audioIndex if source had multiple tracks
 */
public class Dasher {
	public static String NL = System.getProperty("line.separator", "\r\n");
	private static LogWriter logger;
	
	public static void main(String[] cmdargs) throws Exception {
		Map<String,String> params = Utils.parseParams(cmdargs);
		
		params.put("iobuffer", ""); // last shellExec sysout, print on exception
		try {
			File inputFile = new File(params.get("input"));			

			// output folder for manifest.mpd and segment files
			// output/manifest.mpd, output/v1/i.mp4, output/v1/1.m4s, ..
			// output/cenc/manifest.mpd, output/cenc/v1/..
			// output/cbcs/manifest.mpd, output/cbcs/v1/..
			String val = Utils.normalizePath(Utils.getString(params, "output", "", true), true);
			if (val.isEmpty() || val.equals("/")) 
				throw new IllegalArgumentException("Invalid output value '" + val +"'");
			if (!val.endsWith("/")) val+="/";
			File outputFolder = new File(val);
			outputFolder.mkdirs();
			
			// temp folder for temp-v1.mp4(transcoded) intermediate files
			File tempFolder;
			val = Utils.getString(params, "tempfolder", "", true);
			if(val.isEmpty()) {
				tempFolder = new File(outputFolder, "temp/");
			} else {
				if (!val.endsWith("/")) val+="/";
				if(val.indexOf('$')>=0)
					val = val.replace("${GUID}", Utils.getUUID());
				tempFolder = new File(val);
			}
			tempFolder.mkdirs();

			// delete main manifest and old files from output
			if (Utils.getBoolean(params, "deleteoldfiles", true))
				deleteOldFiles(outputFolder, false);
			else
				new File(outputFolder, "manifest.mpd").delete();

			val = Utils.getString(params, "logfile", "", true);
			logger = new LogWriter();
			logger.openFile(val.isEmpty() ? null : new File(val));
			
			MediaTools.initTools(params.get("tool.ffmpeg"), params.get("tool.mp4box"));						

			if(!inputFile.exists())
				throw new FileNotFoundException(inputFile.getAbsolutePath() + " input not found");
			
			logger.println(Utils.getNowAsString() + " Start dashing");
			logger.println("input="  + Utils.normalizePath(inputFile.getAbsolutePath(), true) );
			logger.println("output=" + Utils.normalizePath(outputFolder.getAbsolutePath(), true) );
			
			logger.println("Parameters:");
			for(String key : new TreeSet<String>(params.keySet()) )
				logger.println(key+"="+params.get(key));
			logger.println("");
			
			MediaTools.initParams(params); // init default values		

			logger.println("Input metadata:");			
			Map<String,String> meta = MediaTools.readMetadata(inputFile);			
			for(String key : meta.keySet()) {
				val = meta.get(key);
				logger.println(key+"="+ (val!=null ? val : "") );
			}
						
			val = Utils.getString(params, "mode", "h264", true); // h264,h265
			StreamSpec.TYPE mode = StreamSpec.TYPE.fromString(val);

			// create preview images
			createImages(params, inputFile, outputFolder, (int)Utils.getLong(meta, "durationsec", -1) );
			
			// create a list of stream specs (video and audio tracks)
			List<StreamSpec> specs=new ArrayList<StreamSpec>();
			
			for(int idx=1; ; idx++) {
				// video.1="v1 640x360 768k"
				val = Utils.getString(params, "video."+idx, "", true);
				if (val.isEmpty()) {
					if (idx<=5) continue; // try video.1..5 then give up.
					else break; // end of video.X array  
				}				
				if (val.endsWith("disable") || val.startsWith("disable")) continue;				
				
				String[] valopts = val.split(" ");
				StreamSpec spec = new StreamSpec();
				spec.type   = mode; // h264,h265 
				spec.name   = valopts[0].trim();
				spec.size   = valopts[1].toLowerCase(Locale.US).trim();
				spec.bitrate= valopts[2].toLowerCase(Locale.US).trim();
				//spec.enabled= true;
				spec.inputFile = inputFile;
				spec.inputFileTrack = new File(tempFolder, "temp-"+spec.name+".mp4");

				val = Utils.getString(params, "video."+idx+".profile", "", true);
				if (val.isEmpty()) val = Utils.getString(params, "video.profile", "", true);
				spec.profile=val;

				val = Utils.getString(params, "video."+idx+".level", "", true);
				if (val.isEmpty()) val = Utils.getString(params, "video.level", "", true);
				spec.level=val;

				val = Utils.getString(params, "video."+idx+".crf", "", true);
				if (val.isEmpty()) val = Utils.getString(params, "video.crf", "", true);
				spec.crf=val; // if value found then use CRF encoding

				specs.add(spec);
			}
			
			for(int idx=1; ; idx++) {
				if(Utils.getString(meta, "audioIndex", "", false).isEmpty()) break; // no audio
				// audio.1="a1 48000 128k 2"
				val = Utils.getString(params, "audio."+idx, "", true);
				if (val.isEmpty()) {
					if (idx<=5) continue; // try audio.1..5 then give up.
					else break; // end of video.X array  
				}				
				if (val.endsWith("disable") || val.startsWith("disable")) continue;				
				
				String[] valopts = val.split(" "); 
				StreamSpec spec = new StreamSpec();
				spec.name    = valopts[0].trim();
				spec.sampleRate = Integer.parseInt(valopts[1].trim());
				spec.bitrate = valopts[2].toLowerCase(Locale.US).trim();
				spec.channels= Integer.parseInt(valopts[3].trim());
				spec.type = StreamSpec.TYPE.fromString(valopts.length>=5 ? valopts[4] : "AAC");  
				//spec.enabled = true;
				spec.inputFile = inputFile; // video+audio from the same input file
				spec.inputFileTrack = new File(tempFolder, "temp-"+spec.name+".mp4");
				specs.add(spec);
			}

			// secondary audio inputs, clone "type=AUDIO_*" specs
			// input.1="/temp/audio_swe.mp4", input.2="/temp/audio_ger.mp4"
			List<StreamSpec> newSpecs = new ArrayList<StreamSpec>(4);
			for(int idxI=1; ; idxI++) {
				val = Utils.getString(params, "input."+idxI, "", true);
				if (val.isEmpty()) {
					if (idxI<=5) continue; // try input.1..5 then give up.
					else break;  
				}

				for(int idx=0; idx<specs.size(); idx++) {
					StreamSpec oldSpec = specs.get(idx);
					if(!oldSpec.type.isAudio()) continue;
					StreamSpec spec = (StreamSpec)oldSpec.clone();
					spec.name = spec.name+"-"+idxI; // "a1" -> "a1-1"
					spec.inputFile = new File(val);
					spec.inputFileTrack = new File(tempFolder, "temp-"+spec.name+".mp4");					
					newSpecs.add(spec);
				}
			}
			specs.addAll(newSpecs);

			long timeLimit = Utils.getLong(params, "timelimit", -1); // read X seconds from start
			String overlayOpt = Utils.getString(params, "overlay", "0", true); // 1=enabled, 0=disabled
			
			String origFps  = Utils.getString(meta, "videoFPS", "25", false); // "25", "29.97"
			boolean forceFps= origFps.indexOf('.')>0; // force temp-v1.mp4 output FPS 23.98->24, 29.97->30, 59.94->60
			int fps = forceFps ? (int)Math.round(Double.parseDouble(origFps)) : Integer.parseInt(origFps);
			
			int frags      = (int)Utils.getLong(params, "frags", -1); // frags per segment(multi MOOF/MDAT pairs for low-latency)
			int segdur     = (int)Utils.getLong(params, "segdur", 8000); // millis 8000=8s
			int gopdur     = (int)Utils.getLong(params, "gopdur", 2000); // GOP duration in millis(2000=2s)
			if(segdur<1) {
				// segdur=auto so use the higher magic to decide best values
				if(fps==25 || fps==50) {
					segdur=gopdur=3840;  // 3.84s to align with AAC-48Khz segments
				} else if(fps==30 || fps==60) {
					segdur=gopdur=3200;
				}  else {
					segdur=8000; // 8s to align with AAC48Khz segments
					gopdur=2000;
				}
				params.put("segdur", ""+segdur);
				params.put("gopdur", ""+gopdur);
			}
			logger.println(String.format("%s Use fps=%d, origfps=%s, segdur=%d, gopdur=%d, frags=%d"
				, Utils.getNowAsString(), fps, origFps, segdur, gopdur, frags));
			
			// transcode input file to an intermediate "temp/temp-v1.mp4"
			for(StreamSpec spec : specs) {
				List<String> args=null;
				if(spec.type.isVideo() && spec.inputFile!=null) {
					if(spec.type==StreamSpec.TYPE.VIDEO_H265 && !spec.crf.isEmpty())
						args=MediaTools2.getTranscodeH265Args(spec, fps, forceFps, gopdur, segdur, overlayOpt, timeLimit);
					else if(spec.type==StreamSpec.TYPE.VIDEO_H264 && !spec.crf.isEmpty())
						args=MediaTools2.getTranscodeH264Args(spec, fps, forceFps, gopdur, segdur, overlayOpt, timeLimit);
					else if(spec.type==StreamSpec.TYPE.VIDEO_H265)
						args=MediaTools.getTranscodeH265Args(spec, fps, forceFps, gopdur, segdur, overlayOpt, timeLimit, 2); // legacy, bitrate encoding
					else if(spec.type==StreamSpec.TYPE.VIDEO_H264)
						args=MediaTools.getTranscodeH264Args(spec, fps, forceFps, gopdur, segdur, overlayOpt, timeLimit, 2); // legacy, bitrate encoding

				} else if(spec.type.isAudio() && spec.inputFile!=null) {
					args=MediaTools.getTranscodeAudioArgs(spec, timeLimit);
					
				} else continue;
				
				logger.println(Utils.getNowAsString()+" "+ Utils.implodeList(args, " "));				
				spec.inputFileTrack.delete(); // delete old "temp/temp-v1.mp4" file
				val=MediaTools.executeProcess(args, tempFolder);
				params.put("iobuffer", val);
			}

			logger.println("");

			// segments flags: "nodrm,drm,singleseg", "nodrm" etc..
			// nodrm    = write non-encrypted segments
			// drm      = write encrypted segments
			// singleseg= write single segment, onDemand profile, experimental so may not work on all devices
			List<String> arrSegments = Utils.getList(Utils.getString(params, "segments", "nodrm", true), ",");
			if(arrSegments.contains("singleseg")) {
				params.put("segments.singleseg", "1");
				params.put("livesim", "0");
				params.put("drm.clearkey", "0"); // also see createDRM() function
			}

			// DASH: write unencrypted segments
			if(arrSegments.contains("nodrm")) {
				for(StreamSpec spec : specs)
					deleteOldFiles(new File(outputFolder, spec.name), true);
				
				List<String> args=MediaTools2.getDashArgs(specs, segdur,
					timeLimit,
					Utils.getString(params, "init", "no", true), 
					(int)Utils.getLong(params, "sidx", 0), // -1=no SIDX, 0=one SIDX, 1..n=subsegs
					Utils.getString(params, "segname", "number", true), // number,time, number-timeline, time-timeline
					Utils.getString(params, "cmaf", "", true), // cmf2,cmfc,no
					Utils.getBoolean(params, "segments.singleseg", false),
					"manifest.mpd", false, 
					Utils.getBoolean(params, "hls", true) );
				if(frags>=2) {
					// low-latency multi MOOF/MDAT (frags per segment)
					val = args.get(args.indexOf("-dash")+1);
					args.set(args.indexOf("-frag")+1, ""+(Integer.parseInt(val)/frags) ); // dash=384000 / 16 frags = 24000
				}
				
				logger.println(Utils.getNowAsString()+" "+ Utils.implodeList(args, " "));
				val=MediaTools.executeProcess(args, outputFolder);
				params.put("iobuffer", val);
				
				// Fix some of the common manifest problems after mp4box tool
				File manifestFile = new File(outputFolder, "manifest.mpd");
				DashManifest manifest = new DashManifest(manifestFile);
				manifest.fixContent();
				manifest.setProfile(Utils.getString(params, "profile", "", true));
				manifest.save(new File(outputFolder, "manifest.mpd"), false);
				
				for(StreamSpec spec : specs)
					modifyInitSegment(spec, outputFolder, Utils.getBoolean(params, "livesim", false) ); 
			}

			// DASH: write encrypted segments if KID+KEY values are found
			if (DashDRM.hasParams(params) && arrSegments.contains("drm")) {
				params.put("drm.created","1");
				String origDrmMode = params.get("drm.mode"); // "cenc,cbcs,cbcs0" one or more values
				for(String drmMode : origDrmMode.split(",")) {
					params.put("drm.mode", drmMode.trim());
					File outputFolderDrm = new File(outputFolder, drmMode+"/");
					createDRM(params, segdur, timeLimit, frags, 
						specs, outputFolderDrm, tempFolder);
				}
				params.put("drm.mode", origDrmMode);
			}

			// Subtitles(inband,outband) segments are never encrypted
			SubtitleInserter.setLogger(logger);
			logger.println("");

			createSubtitlesInband(params, new File(outputFolder, "manifest.mpd"), 
				new File(outputFolder, "manifest_subib.mpd"),
				tempFolder,
				true, "");
			createSubtitlesOutband(params, new File(outputFolder, "manifest.mpd"), 
				new File(outputFolder, "manifest_subob.mpd"),
				true, "");
			
			if (Utils.getBoolean(params, "drm.created", false)) {
				for(String drmMode : params.get("drm.mode").split(",")) {
					drmMode = drmMode.trim();
					File outputFolderDrm = new File(outputFolder, drmMode+"/");					
					createSubtitlesInband(params, new File(outputFolderDrm, "manifest.mpd"), 
						new File(outputFolderDrm, "manifest_subib.mpd"),
						tempFolder,
						false, "../");
					createSubtitlesOutband(params, new File(outputFolderDrm, "manifest.mpd"), 
						new File(outputFolderDrm, "manifest_subob.mpd"),
						false, "../");
				}
			}
			
			if (Utils.getBoolean(params, "deletetempfiles", true)) {
				deleteOldFiles(tempFolder, true);
				tempFolder.delete();
			}
						
			params.put("iobuffer", "");
			logger.println("");			
			logger.println(Utils.getNowAsString() + " Completed dashing");
			
			// write metajson to stdout
			if (Utils.getBoolean(params, "logfile.metasysout", false))
				System.out.print(JSONUtil.getJson(meta));
		} catch(Throwable ex) {
			if (logger!=null) {
				logger.println("");
				logger.println(Utils.getNowAsString() + " " + Utils.getStackTrace(ex));
			}
			throw ex;
		} finally {
			if (logger!=null) {
				if(!params.get("iobuffer").isEmpty())
					logger.println("iobuffer: "+ params.get("iobuffer") );
				logger.close();
			}
		}
	}

	public static int deleteOldFiles(File folder, boolean delImages) throws IOException {
		int count=0;
		String exts[] = new String[] { ".m4s", ".mp4", 
				".mpd", ".m3u8", 
				".xml", ".txt" };
		if(delImages) {
			String extn[]  = new String[] {".jpg", ".jpeg", ".png" };
			String newArr[]= new String[exts.length+extn.length];
			System.arraycopy(exts, 0, newArr, 0, exts.length);
			System.arraycopy(extn, 0, newArr, exts.length, extn.length);
			exts = newArr;
		}
		File[] files=folder.listFiles();
		if (files==null) return 0;
		for(File file : files) {
			if (file.isFile()) {
				String name = file.getName();
				for(int idx=0; idx<exts.length; idx++) {
					String ext=exts[idx];
					boolean del=false;
					if(ext.equals(".mp4") || ext.equals(".xml") 
							|| ext.equals(".txt")) {
						if(name.startsWith("temp-") && name.endsWith(ext))
							del=true; // delete "temp-log.txt" but not anything else
						else if(name.startsWith("manifest-") && name.endsWith(ext))
							del=true; // delete "manifest-log.txt"
						else if(name.startsWith("manifest_") && name.endsWith(ext))
							del=true;
						else if(name.equals("i.mp4"))
							del=true;
						else if(name.startsWith("i_") && name.endsWith(ext))
							del=true; // "i_livesim.mp4"
					} else if(name.endsWith(ext)) {
						del=true;					
					}
					if(del) {
						file.delete();
						count++;
					}
				}
			}
		}
		return count;
	}
	
	private static boolean createDRM(Map<String,String> params,
			int segdur, long timeLimit, int frags,
			List<StreamSpec> specs,
			File outputFolderDrm, File tempFolder) 
			throws Exception {
		// DASH: write encrypted segments+manifest if KID+KEY values are found
		DashDRM drm = new DashDRM();
		drm.initParams(params);
		String mode = params.get("drm.mode");
		
		logger.println("");
		logger.println(Utils.getNowAsString()+" Start DRM "+mode);
		drm.printParamsToLogger(logger);
		
		// delete old files from output folder
		outputFolderDrm.mkdir();
		deleteOldFiles(outputFolderDrm, true);
		for(StreamSpec spec : specs) {
			deleteOldFiles( new File(outputFolderDrm, spec.name), true );
		}
		
		// create GPACDRM.xml drm specification file, write to workdir folder
		File specFileVideo=new File(tempFolder, "temp-drmvideo-"+mode+".xml");
		File specFileAudio=new File(tempFolder, "temp-drmaudio-"+mode+".xml");
		specFileVideo.delete();
		specFileAudio.delete();

		String val=drm.createGPACDRM("video", mode); // cenc,cbcs,cbcs0
		logger.println(val);
		FileOutputStream fos = new FileOutputStream(specFileVideo);
		try { fos.write(val.getBytes("UTF-8")); } finally { fos.close(); }					
		val=drm.createGPACDRM("audio", mode); // cenc,cbcs,cbcs0
		logger.println(val);
		fos = new FileOutputStream(specFileAudio);
		try { fos.write(val.getBytes("UTF-8")); } finally { fos.close(); }

		List<String> args;

		// encrypt temp-v1.mp4 to temp-v1-cenc.mp4, temp-v1-cbcs.mp4
		logger.println("");				
		for(StreamSpec spec : specs) {
			args=MediaTools.getDashCryptArgs( 
				spec.type.isAudio() ? specFileAudio : specFileVideo, 
				spec, mode); 
			logger.println(Utils.getNowAsString()+" "+ Utils.implodeList(args, " "));
			val=MediaTools.executeProcess(args, tempFolder);
			params.put("iobuffer", val);
			spec.inputFileTrackDrm = new File(tempFolder, args.get(args.indexOf("-out")+1));
		}
		
		boolean isSingleSeg = Utils.getBoolean(params, "segments.singleseg", false);
		args=MediaTools2.getDashArgs(specs, segdur,
			timeLimit,
			Utils.getString(params, "init", "no", true), 
			(int)Utils.getLong(params, "sidx", 0), // -1=no SIDX, 0=one SIDX, 1..n=subsegs
			Utils.getString(params, "segname", "number", true), // number,time, number-timeline, time-timeline
			Utils.getString(params, "cmaf", "", true), // cmf2,cmfc,no
			isSingleSeg,
			"manifest.mpd", true, 
			Utils.getBoolean(params, "hls", true) );		
		if(frags>=2) {
			// low-latency multi MOOF/MDAT (frags per segment)
			val = args.get(args.indexOf("-dash")+1);
			args.set(args.indexOf("-frag")+1, ""+(Integer.parseInt(val)/frags) ); // dash=384000 / 16 frags = 24000
		}

		logger.println(Utils.getNowAsString()+" "+ Utils.implodeList(args, " "));
		val=MediaTools.executeProcess(args, outputFolderDrm);
		params.put("iobuffer", val);

		// remove moov/trak/senc box from init segments, it breaks some of the hbbtv players,
		// create init.mp without any PSSH boxes, only Playready/Marlin/etc init files for testing use,
		for(StreamSpec spec : specs) {
			modifyInitSegment(spec, outputFolderDrm, Utils.getBoolean(params, "livesim", false) );
			File initFile = new File(outputFolderDrm, spec.name+"/i.mp4");
			File outFile  = new File(outputFolderDrm, spec.name+"/i_nopssh.mp4");					
			if (!isSingleSeg && BoxModifier.removeBox(initFile, outFile, "moov/pssh[*]"))
				logger.println(String.format("Removed moov/pssh[*] from %s to %s"
						, initFile.getAbsolutePath(), outFile.getAbsolutePath()) );

			for(String sysId : (!isSingleSeg ? new String[]{ "playready", "widevine", "marlin", "cenc" } : new String[]{}) ) {
				if (!Utils.getString(params, "drm."+sysId, "0", true).equals("0")) {
					outFile  = new File(outputFolderDrm, String.format("%s/i_%s.mp4", spec.name, sysId));
					if (BoxModifier.keepPSSH(initFile, outFile, sysId))
						logger.println(String.format("Written moov/pssh[%s] from %s to %s"
							, sysId
							, initFile.getAbsolutePath(), outFile.getAbsolutePath()) );						
				}
			}
		}
		
		// fix manifest, add missing drmsystem namespaces
		File manifestFile=new File(outputFolderDrm, "manifest.mpd");
		DashManifest manifest = new DashManifest(manifestFile);
		manifest.fixContent();
		manifest.setProfile(Utils.getString(params, "profile", "", true));
		manifest.addNamespaces();
		
		// add <ContentProtection> elements to <AdaptationSet>				
		manifest.addContentProtectionElement("video", drm.createPlayreadyMPDElement("video") ); // "playready"
		manifest.addContentProtectionElement("audio", drm.createPlayreadyMPDElement("audio") );
		
		manifest.addContentProtectionElement("video", drm.createWidevineMPDElement("video")); // "widevine"
		manifest.addContentProtectionElement("audio", drm.createWidevineMPDElement("audio"));
		
		manifest.addContentProtectionElement("video", drm.createMarlinMPDElement("video")); // "marlin"
		manifest.addContentProtectionElement("audio", drm.createMarlinMPDElement("audio"));					
						
		// remove MPEG-CENC element if was disabled				
		if (Utils.getString(params, "drm.cenc", "0", true).equals("0"))
			manifest.removeContentProtectionElement("cenc");

		manifest.save(manifestFile, false);
		String manifestData = Utils.loadTextFile(manifestFile, "UTF-8").toString();
		
		// write clearkey manifest
		val=drm.createClearKeyMPDElement();
		if (!isSingleSeg && !val.isEmpty()) {
			manifest = new DashManifest(manifestData);
			manifest.addContentProtectionElement("video", val);
			manifest.addContentProtectionElement("audio", val);
			manifest.removeContentProtectionElement("playready");
			manifest.removeContentProtectionElement("widevine");
			manifest.removeContentProtectionElement("marlin");
			String data = manifest.toString().replace("initialization=\"$RepresentationID$_i.mp4\"", 
					"initialization=\"$RepresentationID$_i_nopssh.mp4\"");
			data = manifest.toString().replace("initialization=\"$RepresentationID$/i.mp4\"", 
					"initialization=\"$RepresentationID$/i_nopssh.mp4\"");					
			Utils.saveFile(new File(outputFolderDrm, "manifest_clearkey.mpd"), data.getBytes("UTF-8") );
		}

		// write CENC-clearkey manifest with just MPEG-CENC+EME-CENC(CLEARKEY) <ContentProtection> elements.
		if (!isSingleSeg && !Utils.getString(params, "drm.cenc", "0", true).equals("0")) {
			manifest = new DashManifest(manifestData);
			manifest.addContentProtectionElement("video", drm.createCENCMPDElement("video") );
			manifest.addContentProtectionElement("audio", drm.createCENCMPDElement("audio") );
			manifest.removeContentProtectionElement("playready");
			manifest.removeContentProtectionElement("widevine");
			manifest.removeContentProtectionElement("marlin");
			String data = manifest.toString().replace("initialization=\"$RepresentationID$_i.mp4\"", 
						"initialization=\"$RepresentationID$_i_cenc.mp4\""); // CENC pssh
			data = manifest.toString().replace("initialization=\"$RepresentationID$/i.mp4\"", 
					"initialization=\"$RepresentationID$/i_cenc.mp4\"");					
			Utils.saveFile(new File(outputFolderDrm, "manifest_cenc.mpd"), data.getBytes("UTF-8") );
		}

		// create manifest where init url points to vX_i_nopssh.mp4 files
		String data = manifestData.replace("initialization=\"$RepresentationID$_i.mp4\"", 
				"initialization=\"$RepresentationID$_i_nopssh.mp4\"");
		data = manifestData.replace("initialization=\"$RepresentationID$/i.mp4\"", 
				"initialization=\"$RepresentationID$/i_nopssh.mp4\"");
		if(!isSingleSeg)
			Utils.saveFile(new File(outputFolderDrm, "manifest_nopssh.mpd"), data.getBytes("UTF-8"));

		// create single DRM manifests
		for(String sysId : (!isSingleSeg ? new String[]{ "playready", "widevine", "marlin" } : new String[] {}) ) {
			manifest = new DashManifest(manifestData);
			if (!sysId.equals("playready")) manifest.removeContentProtectionElement("playready");
			if (!sysId.equals("widevine"))  manifest.removeContentProtectionElement("widevine");
			if (!sysId.equals("marlin"))    manifest.removeContentProtectionElement("marlin");
			data = manifest.toString().replace("initialization=\"$RepresentationID$_i.mp4\"", 
						"initialization=\"$RepresentationID$_i_"+sysId+".mp4\"");
			data = manifest.toString().replace("initialization=\"$RepresentationID$/i.mp4\"", 
					"initialization=\"$RepresentationID$/i_"+sysId+".mp4\"");					
			Utils.saveFile(new File(outputFolderDrm, "manifest_"+sysId+".mpd"), data.getBytes("UTF-8"));					
		}

		logger.println(Utils.getNowAsString()+" Completed DRM "+mode);
		return true;
	}

	private static void modifyInitSegment(StreamSpec spec, File outputFolder, boolean livesim) 
			throws IOException {
		// some dash validators give a warning of an unknown atom 'udta', 
		// we don't need this user-defined-meta box.
		File initFile = new File(outputFolder, spec.name+"/i.mp4");
		if (BoxModifier.removeBox(initFile, initFile, "moov/trak/senc"))
			logger.println("Removed moov/trak/senc from " + initFile.getAbsolutePath() );
		if (BoxModifier.removeBox(initFile, initFile, "moov/udta"))
			logger.println("Removed moov/udta from " + initFile.getAbsolutePath() );

		// create an init.mp4 for livesim use(remove total duration atom)
		if(livesim) {
			File outFile = new File(outputFolder, spec.name+"/i_livesim.mp4");
			if (BoxModifier.removeBox(initFile, outFile, "moov/mvex/mehd"))
				logger.println("Removed moov/mvex/mehd from " + outFile.getAbsolutePath() );
		}		
	}
	
	private static void createSubtitlesInband(Map<String,String> params, 
			File manifestFile, File manifestOutput, File tempFolder,
			boolean splitSegments, String urlPrefix) throws Exception {
		// parse subib.X=sub_fin fin sub_fin.xml
		boolean isFirstSub=true;
		for(int idx=1; ; idx++) {
			String val = Utils.getString(params, "subib."+idx, "", true);
			if (val.isEmpty()) {
				if (idx<=5) continue; // try 1..5 then give up.
				else break;  
			}
			if (val.endsWith("disable") || val.startsWith("disable")) continue;
			String[] valopts = val.split(" ");

			logger.println("Create subtitles(inband) "+val);			
			SubtitleInserter.insertIB(new File(valopts[2].trim()),	// input "sub_fin.xml" file path 
				isFirstSub?manifestFile:manifestOutput, 
				manifestOutput,
				tempFolder,
				valopts[1].trim(),	// lang "fin"
				valopts[0].trim(),  // repId "sub_fin"
				splitSegments, // split xml file to sub_fin/sub_1.m4s or reuse an existing segs
				(int)Utils.getLong(params, "segdur", 8000),
				Utils.getBoolean(params, "deletetempfiles", true), 
				urlPrefix,
				Utils.getString(params, "cmaf", "", true), // cmf2,cmfc,no
				false, //Utils.getBoolean(params, "segments.singleseg", false),
				Utils.getString(params, "segname", "number", true),
				Utils.getLong(params, "timelimit", -1) // read X seconds from start
			);
			isFirstSub=false;			
		}
	}

	private static void createSubtitlesOutband(Map<String,String> params, File manifestFile, File manifestOutput,
			boolean copySubFile, String urlPrefix) throws Exception {
		// parse subob.X=sub_fin fin sub_fin.xml
		boolean isFirstSub=true;
		for(int idx=1; ; idx++) {
			String val = Utils.getString(params, "subob."+idx, "", true);
			if (val.isEmpty()) {
				if (idx<=5) continue; // try 1..5 then give up.
				else break;  
			}
			if (val.endsWith("disable") || val.startsWith("disable")) continue;
			String[] valopts = val.split(" ");
	
			logger.println("Create subtitles(outband) "+val);			
			SubtitleInserter.insertOB(new File(valopts[2].trim()),	// input "sub_fin.xml" file path 
				isFirstSub?manifestFile:manifestOutput, 
				manifestOutput, 
				valopts[1].trim(),	// lang "fin"
				valopts[0].trim(),  // repId "sub_fin"
				copySubFile,
				urlPrefix);
			isFirstSub=false;
		}
	}

	private static boolean createImages(Map<String,String> params, 
			File inputFile, File outputFolder, int inputDurationSec) throws IOException {
		String val = Utils.getString(params, "image.seconds", "", true);  // "15" or "15,60,120"
		if(val.isEmpty() || val.equalsIgnoreCase("-1")) return false;		
		List<String> timeSecs = Utils.getList(val, ",");

		List<String> items=new ArrayList<String>(4);
		logger.println("");
		for(int idx=1; ; idx++) {
			val = Utils.getString(params, "image."+idx, "", true); // image.1=640x360
			if (val.isEmpty()) break;
			if (!val.endsWith("disable")) items.add(val);
		}
		if(!items.isEmpty()) {
			// adjust timestamp if video duration is short or inside the trailing "DURATION-10s" range 
			// short video may have just one I-Frame at the start,
			// this code expects to find I-Frames so timestamp is not an exact offset.
			for(int idx=0; idx<timeSecs.size(); idx++) {
				int timeSec = Integer.parseInt(timeSecs.get(idx).trim());
				if(timeSec<0) continue;
				
				if (inputDurationSec>0 && inputDurationSec<=10) {
					timeSec = idx==0 ? 0 : timeSec>=10 ? inputDurationSec/2 : timeSec;
				} else if(inputDurationSec>0 && inputDurationSec<=30) {
					timeSec = idx==0 ? Math.min(timeSec, 10) : timeSec>=30 ? inputDurationSec/2 : timeSec; 
				}
				if(timeSec>0 && inputDurationSec>0 && timeSec>=inputDurationSec-10) {
					timeSec = idx==0 ? Math.max(inputDurationSec-10, (int)(inputDurationSec / 2))
						: timeSec>=inputDurationSec-10 ? inputDurationSec-5 : timeSec;
				}

				// "image_{w}x{h}.jpg" -> image_640x360.jpg, image_640x360_1.jpg, image_640x360_2.jpg
				String filename = Utils.getString(params, "image.filename", "image_{w}x{h}.jpg", true);
				if(filename.contains("{idx}")) {
					filename = filename.replace("{idx}", ""+(idx+1));
				} else if(idx>=1) {
					int delim = filename.lastIndexOf('.');
					filename = filename.substring(0,delim) + "_"+idx+ filename.substring(delim);
				}
				
				List<String> args=MediaTools2.getImageArgs(inputFile, timeSec, items, "", filename);
				logger.println(Utils.getNowAsString()+" "+ Utils.implodeList(args, " "));
				val=MediaTools.executeProcess(args, outputFolder);
				params.put("iobuffer", val);
			}
		}
		return true;
	}
	
}
