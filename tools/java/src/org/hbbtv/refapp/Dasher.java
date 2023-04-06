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
 * FIXME: add "lang=xxx" video-audio param and set ffmpeg metadata field on temp-v1.mp4 file
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
			logger.openFile(val.isEmpty() ? null : new File(val), false);
			
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
			
			// create preview images
			createImages(params, inputFile, outputFolder, (int)Utils.getLong(meta, "durationsec", -1) );
			
			// create a list of stream specs (video and audio tracks)
			List<StreamSpec> specs=new ArrayList<StreamSpec>();
			
			val = Utils.getString(params, "input.arg", "", true); // optional input args: input.arg="vlang=und alang=eng"
			Utils.putArgsToParams(params, "input.", val.split("\\s* \\s*") );
			
			for(int idx=1; ; idx++) {
				// video.1="v1 640x360 512k"
				// video.1="v1 640x360 512k profile=high level=3.1 crf=23 codec=h264"
				val = Utils.getString(params, "video."+idx, "", true);
				if (val.isEmpty()) {
					if (idx<=5) continue; // try video.1..5 then give up.
					else break; // end of video.X array  
				}				
				if (val.endsWith("disable") || val.startsWith("disable")) continue;				
				
				String[] valopts = val.split("\\s* \\s*"); // delim=empty space trim tuple delimiters
				StreamSpec spec= new StreamSpec();				
				spec.name      = valopts[0].trim();
				spec.size      = valopts[1].toLowerCase(Locale.US).trim();
				spec.bitrate   = valopts[2].toLowerCase(Locale.US).trim();
				for(int idxOpt=3; idxOpt<valopts.length; idxOpt++) {
					val = valopts[idxOpt].trim();
					int delim=val.indexOf('=');
					if(delim>0) params.put("video."+idx+"."+val.substring(0,delim), val.substring(delim+1));
				}
				
				//spec.enabled= true;
				spec.lang = Utils.getString(params, "input.vlang", "", true);			
				spec.inputFile = inputFile;
				spec.inputFileTrack = new File(tempFolder, "temp-"+spec.name+".mp4");

				val = Utils.getString(params, "video."+idx+".codec", "", true);
				if (val.isEmpty()) val = Utils.getString(params, "video.codec", "h264", true);
				spec.type = StreamSpec.TYPE.fromString(val); // h264,h265

				val = Utils.getString(params, "video."+idx+".profile", "", true);
				if (val.isEmpty()) val = Utils.getString(params, "video.profile", "", true);
				spec.profile=val;

				val = Utils.getString(params, "video."+idx+".level", "", true);
				if (val.isEmpty()) val = Utils.getString(params, "video.level", "", true);
				spec.level=val;
				
				val = Utils.getString(params, "video."+idx+".crf", "", true); // 0=bitrate encoding, 1..n=crf encoding
				if (val.isEmpty()) {
					val = Utils.getString(params, "video.crf", "", true);
					if(val.isEmpty() && spec.type==StreamSpec.TYPE.VIDEO_H264) val="23";
					else if(val.isEmpty() && spec.type==StreamSpec.TYPE.VIDEO_H265) val="28";
				}
				spec.crf = !val.equals("0") ? val : "";

				spec.role     = "main";
				spec.groupIdx = 0; // videos are grouped by codec(h264,h265,..), see MediaTools2.getDashArgs()
				specs.add(spec);
			}
			
			// audio should use the same codec for all bitrates, multiple audio codec may or may not work atm.
			for(int idx=1; ; idx++) {
				if(Utils.getString(meta, "audioIndex", "", false).isEmpty()) break; // no audio
				// audio.1="a1 48000 128k 2"
				// audio.1="a1 48000 128k 2 codec=AAC"
				val = Utils.getString(params, "audio."+idx, "", true);
				if (val.isEmpty()) {
					if (idx<=5) continue; // try audio.1..5 then give up.
					else break; // end of video.X array  
				}				
				if (val.endsWith("disable") || val.startsWith("disable")) continue;				
				
				String[] valopts = val.split("\\s* \\s*"); 
				StreamSpec spec= new StreamSpec();
				spec.name      = valopts[0].trim();
				spec.sampleRate= Integer.parseInt(valopts[1].trim());
				spec.bitrate   = valopts[2].toLowerCase(Locale.US).trim();
				spec.channels  = valopts.length>=4 ? Integer.parseInt(valopts[3].trim()) : 2;
				for(int idxOpt=3; idxOpt<valopts.length; idxOpt++) {
					val = valopts[idxOpt].trim();
					int delim=val.indexOf('=');
					if(delim>0) params.put("audio."+idx+"."+val.substring(0,delim), val.substring(delim+1));
				}
				
				val = Utils.getString(params, "audio."+idx+".codec", "", true);
				if (val.isEmpty()) val = Utils.getString(params, "audio.codec", "AAC", true);
				spec.type = StreamSpec.TYPE.fromString(val); // AAC, AC3, EAC3
				
				//spec.enabled = true;
				spec.lang = Utils.getString(params, "input.alang", "", true);				
				spec.inputFile = inputFile; // video+audio from the same input file
				spec.inputFileTrack = new File(tempFolder, "temp-"+spec.name+".mp4");
				spec.role      = "main";
				spec.groupIdx  = 1; // codec+lang (primary lang bitrates)
				specs.add(spec);
			}

			// secondary audio lang inputs, clone "type=AUDIO_*" specs, each lang goes to a separate track group(adaptation set) 
			// input.1="/temp/audio_swe.mp4", input.2="/temp/audio_ger.mp4"
			List<StreamSpec> newSpecs = new ArrayList<StreamSpec>(4);
			for(int idxI=1; ; idxI++) {
				val = Utils.getString(params, "input."+idxI, "", true);
				if (val.isEmpty()) {
					if (idxI<=5) continue; // try input.1..5 then give up.
					else break;  
				} else if (val.endsWith("disable") || val.startsWith("disable")) continue;
				String filename=val;

				val = Utils.getString(params, "input."+idxI+".arg", "", true); // optional input args: input.1.arg="alang=swe"
				Utils.putArgsToParams(params, "input."+idxI+".", val.split("\\s* \\s*") );

				for(int idx=0; idx<specs.size(); idx++) {
					StreamSpec oldSpec = specs.get(idx);
					if(!oldSpec.type.isAudio()) continue;
					StreamSpec spec = (StreamSpec)oldSpec.clone();
					spec.name = spec.name+"-"+idxI; // "a1" -> "a1-1"
					spec.lang = Utils.getString(params, "input."+idxI+".alang", "", true);					
					spec.inputFile = new File(filename);
					spec.inputFileTrack = new File(tempFolder, "temp-"+spec.name+".mp4");
					spec.role     = "alternate"; // alternate or main for additional languages? HbbTV exactly just one "main"
					spec.groupIdx = spec.groupIdx+idxI; // codec+lang (2..n lang bitrates)
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
					segdur=3840;       // 3.84s to align with AAC-48Khz segments
					gopdur=segdur / 2; // 1.92s GOP, two IDR frames in a segment
				} else if(fps==30 || fps==60) {
					segdur=3200;       // 3.2s segment
					gopdur=segdur / 2; // 1.6s GOP
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
			// first call writes "sub_eng/i.mp4, 1.m4s, .." inband files or copy "sub_eng.xml" outband file
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
				final String[] manifests = new String[] {
					"manifest", "manifest_prcenc", "manifest_wvcenc",
					"manifest_prwvcenc", "manifest_mlcenc"
				};
				
				for(String drmMode : params.get("drm.mode").split(",")) {
					drmMode = drmMode.trim();
					File outputFolderDrm = new File(outputFolder, drmMode+"/");
					for(String manifest : manifests) {
						createSubtitlesInband(params, new File(outputFolderDrm, manifest+".mpd"), 
							new File(outputFolderDrm, manifest+"_subib.mpd"),
							tempFolder,
							false, "../");
						createSubtitlesOutband(params, new File(outputFolderDrm, manifest+".mpd"), 
							new File(outputFolderDrm, manifest+"_subob.mpd"),
							false, "../");
					}				
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
		
		String val=drm.createGPACDRM("video", mode); // cenc,cbcs,cbcs0
		logger.println(val);
		File specFileVideo=new File(tempFolder, "temp-drmvideo-"+mode+".xml");
		Utils.saveFile(specFileVideo, val.getBytes("UTF-8"));

		val=drm.createGPACDRM("audio", mode); // cenc,cbcs,cbcs0
		logger.println(val);
		File specFileAudio=new File(tempFolder, "temp-drmaudio-"+mode+".xml");		
		Utils.saveFile(specFileAudio, val.getBytes("UTF-8"));		

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

		// do not change the ordering of drmTypes array
		final DashDRM.DRMType[] drmTypes = new DashDRM.DRMType[] {
			DashDRM.PLAYREADY, DashDRM.WIDEVINE, DashDRM.MARLIN, DashDRM.CENC 
		};
		
		 // combo manifest+init: "prwv", "prwvcenc", "prcenc", "wvcenc", "mlcenc" 
		final int[][] drmTypesCombo = new int[][]{  {0,1}, {0,1,3}, {0,3}, {1,3}, {2,3}  };
		if(Utils.getString(params, "drm.playready", "0", true).equals("0")) // playready is disabled
			drmTypesCombo[0]=drmTypesCombo[1]=drmTypesCombo[2] = new int[]{};
		if(Utils.getString(params, "drm.widevine", "0", true).equals("0"))  // widevine is disabled
			drmTypesCombo[0]=drmTypesCombo[1]=drmTypesCombo[3] = new int[]{};
		if(Utils.getString(params, "drm.widevine", "0", true).equals("0"))
			drmTypesCombo[4]=new int[]{};
		
		for(StreamSpec spec : specs) {
			modifyInitSegment(spec, outputFolderDrm, Utils.getBoolean(params, "livesim", false) ); // remove senc+udta from init 
			File initFile = new File(outputFolderDrm, spec.name+"/i.mp4");
			File outFile  = new File(outputFolderDrm, spec.name+"/i_nopssh.mp4"); // without any PSSH boxes					
			if (!isSingleSeg && BoxModifier.removeBox(initFile, outFile, "moov/pssh[*]"))
				logger.println(String.format("Removed moov/pssh[*] from %s to %s"
						, initFile.getAbsolutePath(), outFile.getAbsolutePath()) );

			if(!isSingleSeg) {
				for(DashDRM.DRMType drmType : drmTypes) {
					if (!Utils.getString(params, "drm."+drmType.NAME, "0", true).equals("0")) {
						outFile  = new File(outputFolderDrm, String.format("%s/i_%s.mp4", spec.name, drmType.TAG)); // "v1/i_pr.mp4"
						if (BoxModifier.keepPSSH(initFile, outFile, drmType.NAME))
							logger.println(String.format("Written moov/pssh[%s] from %s to %s"
								, drmType.NAME, initFile.getAbsolutePath(), outFile.getAbsolutePath()) );						
					}
				}
			}
			
			// Playready+Widevine+CENC combo
			for(int idx=(!isSingleSeg?0:999); idx < drmTypesCombo.length; idx++) {
				String tag="", name="";
				int[] indexes = drmTypesCombo[idx]; // 0..n index of drmTypes array, empty array=skip
				for(int idxI=0; idxI<indexes.length; idxI++) {
					tag += drmTypes[indexes[idxI]].TAG;      // "prwvcenc"
					name+= drmTypes[indexes[idxI]].NAME+","; // "playready,widevine,cenc"
				}
				if(tag.isEmpty()) continue;
				outFile  = new File(outputFolderDrm, String.format("%s/i_%s.mp4", spec.name, tag));
				if (BoxModifier.keepPSSH(initFile, outFile, name))
					logger.println(String.format("Written moov/pssh[%s] from %s to %s"
						, tag, initFile.getAbsolutePath(), outFile.getAbsolutePath()) );
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
			manifest.removeContentProtectionElement("", "cenc");

		manifest.save(manifestFile, false);
		String manifestData = Utils.loadTextFile(manifestFile, "UTF-8").toString();
		
		// write clearkey manifest, use this one for clearkey testing
		val=drm.createClearKeyMPDElement();
		if (!isSingleSeg && !val.isEmpty()) {
			manifest = new DashManifest(manifestData);
			manifest.addContentProtectionElement("video", val);
			manifest.addContentProtectionElement("audio", val);
			for(int idx=0; idx<3; idx++)
				manifest.removeContentProtectionElement("", drmTypes[idx].NAME); // playready,widevine,marlin			
			String data = manifest.toString().replace("initialization=\"$RepresentationID$/i.mp4\"", 
					"initialization=\"$RepresentationID$/i_nopssh.mp4\"");					
			Utils.saveFile(new File(outputFolderDrm, "manifest_ck.mpd"), data.getBytes("UTF-8") );
			
			data = manifest.toString().replace("initialization=\"$RepresentationID$/i.mp4\"", 
					"initialization=\"$RepresentationID$/i_cenc.mp4\"");					
			Utils.saveFile(new File(outputFolderDrm, "manifest_ckcenc.mpd"), data.getBytes("UTF-8") );			
		}

		// write CENC-clearkey manifest with just MPEG-CENC+EME-CENC(CLEARKEY) <ContentProtection> elements (legacy)
		/*if (!isSingleSeg && !Utils.getString(params, "drm.cenc", "0", true).equals("0")) {
			manifest = new DashManifest(manifestData);
			manifest.addContentProtectionElement("video", drm.createCENCMPDElement("video") );
			manifest.addContentProtectionElement("audio", drm.createCENCMPDElement("audio") );
			for(int idx=0; idx<3; idx++)
				manifest.removeContentProtectionElement(drmTypes[idx].NAME); // playready,widevine,marlin
			String data = manifest.toString().replace("initialization=\"$RepresentationID$/i.mp4\"", 
					"initialization=\"$RepresentationID$/i_cenc.mp4\""); // CENC pssh
			Utils.saveFile(new File(outputFolderDrm, "manifest_cenc.mpd"), data.getBytes("UTF-8") );
		}*/

		// create manifest where init url points to i_nopssh.mp4 files
		String data = manifestData.replace("initialization=\"$RepresentationID$/i.mp4\"", 
				"initialization=\"$RepresentationID$/i_nopssh.mp4\"");
		if(!isSingleSeg)
			Utils.saveFile(new File(outputFolderDrm, "manifest_nopssh.mpd"), data.getBytes("UTF-8"));

		// create single DRM manifests, first 3 types "playready","widevine","marlin"
		for(int idx=(!isSingleSeg?0:999); idx<3; idx++) {		
			String name = drmTypes[idx].NAME;
			manifest = new DashManifest(manifestData);
			if (!name.equals(DashDRM.PLAYREADY.NAME)) manifest.removeContentProtectionElement("",DashDRM.PLAYREADY.NAME);
			if (!name.equals(DashDRM.WIDEVINE.NAME))  manifest.removeContentProtectionElement("",DashDRM.WIDEVINE.NAME);
			if (!name.equals(DashDRM.MARLIN.NAME))    manifest.removeContentProtectionElement("",DashDRM.MARLIN.NAME);
			data = manifest.toString().replace("initialization=\"$RepresentationID$/i.mp4\"", 
				"initialization=\"$RepresentationID$/i_"+drmTypes[idx].TAG+".mp4\""); // "pk","wv,"ml"			
			if ( !Utils.getString(params, "drm."+name, "0", true).equals("0") )
				Utils.saveFile(new File(outputFolderDrm, "manifest_"+drmTypes[idx].TAG+".mpd"), data.getBytes("UTF-8"));					
		}
		
		for(int idx=(!isSingleSeg?0:999); idx < drmTypesCombo.length; idx++) {
			String tag="", name="";
			int[] indexes = drmTypesCombo[idx];
			for(int idxI=0; idxI<indexes.length; idxI++) {
				tag += drmTypes[indexes[idxI]].TAG;      // "prwvcenc"
				name+= drmTypes[indexes[idxI]].NAME+","; // "playready,widevine,marlin,cenc"
			}
			if(tag.isEmpty()) continue;
			
			manifest = new DashManifest(manifestData);
			//manifest.removeContentProtectionElement("",DashDRM.MARLIN.NAME);
			if(!name.contains(DashDRM.PLAYREADY.NAME)) manifest.removeContentProtectionElement("",DashDRM.PLAYREADY.NAME);
			if(!name.contains(DashDRM.WIDEVINE.NAME))  manifest.removeContentProtectionElement("",DashDRM.WIDEVINE.NAME);				
			if(!name.contains(DashDRM.MARLIN.NAME))  manifest.removeContentProtectionElement("",DashDRM.MARLIN.NAME);			
			data = manifest.toString().replace("initialization=\"$RepresentationID$/i.mp4\"", 
					"initialization=\"$RepresentationID$/i_"+tag+".mp4\"");
			Utils.saveFile(new File(outputFolderDrm, "manifest_"+tag+".mpd"), data.getBytes("UTF-8"));				
		}
			
		logger.println(Utils.getNowAsString()+" Completed DRM "+mode);
		return true;
	}

	private static void modifyInitSegment(StreamSpec spec, File outputFolder, boolean livesim) 
			throws IOException {
		// remove moov/trak/senc box from init.mp4, it breaks some hbbtv players, box is found in a 1..n.m4s files.		
		// some dash validators give a warning of an unknown atom 'udta', we don't need an user-defined-meta box. 
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
		if(!splitSegments && !manifestFile.exists()) return;		
		boolean isFirstSub=true;
		int asId=50; // AdaptationSet@id
		for(int idx=1; ; idx++) {
			String val = Utils.getString(params, "subib."+idx, "", true);
			if (val.isEmpty()) {
				if (idx<=5) continue; // try 1..5 then give up.
				else break;  
			}
			if (val.endsWith("disable") || val.startsWith("disable")) continue;
			String[] valopts = val.split("\\s* \\s*");

			asId++;
			logger.println("Create subtitles(inband) "+val);			
			SubtitleInserter.insertIB(new File(valopts[2].trim()),	// input "sub_fin.xml" file path 
				isFirstSub?manifestFile:manifestOutput, 
				manifestOutput,
				tempFolder,
				valopts[1].trim(),	// lang "fin"
				valopts[0].trim(),  // repId "sub_fin"
				asId,
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
		if(!copySubFile && !manifestFile.exists()) return;
		boolean isFirstSub=true;
		int asId=50; // AdaptationSet@id
		for(int idx=1; ; idx++) {
			String val = Utils.getString(params, "subob."+idx, "", true);
			if (val.isEmpty()) {
				if (idx<=5) continue; // try 1..5 then give up.
				else break;  
			}
			if (val.endsWith("disable") || val.startsWith("disable")) continue;
			String[] valopts = val.split("\\s* \\s*");
	
			asId++;
			logger.println("Create subtitles(outband) "+val);			
			SubtitleInserter.insertOB(new File(valopts[2].trim()),	// input "sub_fin.xml" file path 
				isFirstSub?manifestFile:manifestOutput, 
				manifestOutput, 
				valopts[1].trim(),	// lang "fin"
				valopts[0].trim(),  // repId "sub_fin"
				asId,
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
