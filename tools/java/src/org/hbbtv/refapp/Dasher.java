package org.hbbtv.refapp;

import java.util.*;
import java.io.*;

/**
 * MAIN CLASS: Transcode, Dash, DashEncrypt input video file.
 * Example command, output if current working directory:
 *   java -jar /refapp/lib/dasher.jar config=dasher.properties logfile=/videos/file1/manifest-log.txt drm.kid=rng drm.key=rng input=/videos/file1.mp4 output=/videos/file1/
 *   
 * TODO: if drm.xxx=0 is disabled then don't write init.mp4 and manifest_xxx.mpd drm files
 */
public class Dasher {
	public static String NL = System.getProperty("line.separator", "\r\n");
	private static LogWriter logger;
	
	public static void main(String[] cmdargs) throws Exception {
		Map<String,String> params = Utils.parseParams(cmdargs);

		String iobuffer="";
		try {
			File inputFile = new File(params.get("input"));

			String val = Utils.normalizePath(Utils.getString(params, "output", "", true), true);
			if (val.isEmpty() || val.equals("/")) 
				throw new IllegalArgumentException("Invalid output value '" + val +"'");
			if (!val.endsWith("/")) val+="/";
			File outputFolder = new File(val);
			outputFolder.mkdirs();

			boolean useIdFolder=true; // use new segments "v1/i.mp4", "v1/1.m4s" representationID subfolder
			
			// delete old files from output folder
			if (Utils.getBoolean(params, "deleteoldfiles", true))
				deleteOldFiles(outputFolder);
			else
				new File(outputFolder, "manifest.mpd").delete();

			val = Utils.getString(params, "logfile", "", true);
			logger = new LogWriter();
			logger.openFile(val.isEmpty() ? null : new File(val));
			
			MediaTools.initTools(params.get("tool.ffmpeg"), params.get("tool.mp4box"));						

			logger.println(Utils.getNowAsString() + " Start dashing");
			logger.println("input="  + Utils.normalizePath(inputFile.getAbsolutePath(), true) );
			logger.println("output=" + Utils.normalizePath(outputFolder.getAbsolutePath(), true) );
			
			logger.println("Parameters:");
			for(String key : new TreeSet<String>(params.keySet()) )
				logger.println(key+"="+params.get(key));
			logger.println("");

			logger.println("Input metadata:");			
			Map<String,String> meta = MediaTools.readMetadata(inputFile);			
			for(String key : meta.keySet())
				logger.println(key+"="+meta.get(key));
			
			int fps = (int)Utils.getLong(meta, "videoFPS", 25);
			int gopdur = (int)Utils.getLong(params, "gopdur", 3); // GOP duration in seconds
			String overlayOpt = Utils.getString(params, "overlay", "0", true); // 1=enabled, 0=disabled
			int frags  = (int)Utils.getLong(params, "frags", -1); // frags per segment file(multi MOOF/MDAT pairs for low-latency) 
			
			val = Utils.getString(params, "mode", "h264", true); // VIDEO mode h264,h265|dash
			StreamSpec.TYPE mode = StreamSpec.TYPE.fromString(val);
			
			// create preview images
			// size: 640x360
			int timeSec=(int)Utils.getLong(params, "image.seconds", -1);
			if (timeSec>=0) {
				//FIXME: use image.1 then use JavaImage scaler to resize rest of the images.
				logger.println("");
				for(int idx=1; ; idx++) {
					val = Utils.getString(params, "image."+idx, "", true); // 640x360
					if (val.isEmpty()) break;
					List<String> args=MediaTools.getImageArgs(inputFile, timeSec, val);
					logger.println(Utils.getNowAsString()+" "+ Utils.implodeList(args, " "));
					if (!val.endsWith("disable"))
						iobuffer=MediaTools.executeProcess(args, outputFolder);				
				}
			}

			long timeLimit = Utils.getLong(params, "timelimit", -1); // read X seconds from start
			// use an explicit timelimit for ffmpeg or use video duration for all audios (full seconds)
			//if (timeLimit<0)
			//	timeLimit = Utils.getLong(meta, "durationsec", timeLimit);
			
			List<StreamSpec> specs=new ArrayList<StreamSpec>();

			// transcode video.1,video.2,.. output streams
			// name size bitrate: v1 640x360 512k
			logger.println("");			
			for(int idx=1; ; idx++) {
				val = Utils.getString(params, "video."+idx, "", true);
				if (val.isEmpty()) {
					if (idx<=5) continue; // try video.1..5 then give up.
					else break; // end of video.X array  
				}
				
				boolean isDisabled = val.endsWith("disable");
				String[] valopts = val.split(" ");
				StreamSpec spec = new StreamSpec();
				spec.type = mode!=StreamSpec.TYPE.DASH ? 
						mode : StreamSpec.TYPE.VIDEO_H264; // video mode is h264 or h265 
				spec.name = valopts[0].trim();
				spec.size = valopts[1].toLowerCase(Locale.US).trim();
				spec.bitrate = valopts[2].toLowerCase(Locale.US).trim();
				spec.enabled = !isDisabled;

				if (useIdFolder && Utils.getBoolean(params, "deleteoldfiles", true))
					deleteOldFiles( new File(outputFolder, spec.name) );

				val = Utils.getString(params, "video."+idx+".profile", "", true);
				if (val.isEmpty()) val = Utils.getString(params, "video.profile", "", true);
				spec.profile=val;

				val = Utils.getString(params, "video."+idx+".level", "", true);
				if (val.isEmpty()) val = Utils.getString(params, "video.level", "", true);
				spec.level=val;

				specs.add(spec);
				
				if (mode!=StreamSpec.TYPE.DASH) {
					List<String> args = spec.type==StreamSpec.TYPE.VIDEO_H265 ?
						MediaTools.getTranscodeH265Args(inputFile, spec, fps, gopdur, overlayOpt, timeLimit, 2) :
						MediaTools.getTranscodeH264Args(inputFile, spec, fps, gopdur, overlayOpt, timeLimit, 2);
					logger.println(Utils.getNowAsString()+" "+ Utils.implodeList(args, " "));
					if (!isDisabled) {
						iobuffer=MediaTools.executeProcess(args, outputFolder);
						if (spec.type==StreamSpec.TYPE.VIDEO_H265) {
							// convert temp-v1.mp4(HEV1) to temp-v1.mp4(HVC1), this works better in some devices. 
							// test: create hvc1 directly in ffmpeg -tag:v hvc1?
							logger.println(String.format("%s Convert HEV1 to HVC1 (name=%s)", Utils.getNowAsString(), spec.name));
							MediaTools.convertHEV1toHVC1(outputFolder, spec);
						}					
					}
				}
			}

			// transcode audio.1,audio.2,.. output streams
			// name samplerate bitrate channels codec: "a1 48000 128k 2 aac"
			logger.println("");			
			for(int idx=1; ; idx++) {
				val = Utils.getString(params, "audio."+idx, "", true);
				if (val.isEmpty()) break;
				boolean isDisabled = val.endsWith("disable");		
				String[] valopts = val.split(" "); 
				StreamSpec spec = new StreamSpec();
				spec.name = valopts[0].trim();
				spec.sampleRate = Integer.parseInt(valopts[1].trim());
				spec.bitrate = valopts[2].toLowerCase(Locale.US).trim();
				spec.channels = Integer.parseInt(valopts[3].trim());
				spec.type = StreamSpec.TYPE.fromString(valopts.length>=5 ? valopts[4] : "AAC");  
				spec.enabled = !isDisabled;
				specs.add(spec);
				
				if (useIdFolder && Utils.getBoolean(params, "deleteoldfiles", true))
					deleteOldFiles( new File(outputFolder, spec.name) );

				if (mode!=StreamSpec.TYPE.DASH) {
					List<String> args=MediaTools.getTranscodeAudioArgs(inputFile, spec, timeLimit);
					logger.println(Utils.getNowAsString()+" "+ Utils.implodeList(args, " "));
					if (!isDisabled)
						iobuffer=MediaTools.executeProcess(args, outputFolder);
				}
			}
			
			// transcode secondary audio inputs, append new spec to StreamSpec list
			logger.println("");		
			for(int idxI=1, specCount=specs.size(); ; idxI++) {
				if (mode==StreamSpec.TYPE.DASH) break;
				val = Utils.getString(params, "input."+idxI, "", true);
				if (val.isEmpty()) break;
				File inputFileSec = new File(val);
				for(int idx=0; idx<specCount; idx++) {
					StreamSpec spec = specs.get(idx);
					if (spec.type != StreamSpec.TYPE.AUDIO_AAC || !spec.enabled) continue;
					spec = (StreamSpec)spec.clone();
					spec.name = spec.name+"-"+idxI;
					specs.add(spec);
					
					if (useIdFolder && Utils.getBoolean(params, "deleteoldfiles", true)) {
						File folder = new File(outputFolder, spec.name);
						deleteOldFiles(folder);
						folder.delete();
					}
					
					List<String> args=MediaTools.getTranscodeAudioArgs(inputFileSec, spec, timeLimit);
					logger.println(Utils.getNowAsString()+" "+ Utils.implodeList(args, " "));
					iobuffer=MediaTools.executeProcess(args, outputFolder);
				}
			}
			
			// DASH: write unencypted segments+manifest, use original input(mode=dash) or temp-v1.mp4 transcoding
			logger.println("");
			List<String> args=MediaTools.getDashArgs(specs, (int)Utils.getLong(params, "segdur", 6), gopdur,
				timeLimit,
				Utils.getString(params, "init", "no", true), 
				(int)Utils.getLong(params, "sidx", 0), // -1=no SIDX, 0=one SIDX, 1..n=subsegs
				Utils.getString(params, "segname", "number", true), // number,time, number-timeline, time-timeline
				(int)Utils.getLong(params, "segver", 4),
				mode==StreamSpec.TYPE.DASH? Utils.normalizePath(inputFile.getParent(),true)+"/" : "temp-"
				, Utils.getString(params, "cmaf", "", true) // cmf2,cmfc,no
				);
			if(frags>=2) {
				// low-latency multi MOOF/MDAT (frags per segment)
				val = args.get(args.indexOf("-dash")+1);
				args.set(args.indexOf("-frag")+1, ""+(Integer.parseInt(val)/frags) ); // dash=384000 / 16 frags = 24000
			}
			
			logger.println(Utils.getNowAsString()+" "+ Utils.implodeList(args, " "));
			iobuffer=MediaTools.executeProcess(args, outputFolder);
			
			// Fix some of the common manifest problems after mp4box tool and missing fields
			File manifestFile = new File(outputFolder, "manifest.mpd");
			DashManifest manifest = new DashManifest(manifestFile);
			manifest.fixContent(gopdur);
			manifest.setProfile(Utils.getString(params, "profile", "hbbtv15", true));
			manifest.save(new File(outputFolder, "manifest.mpd"), false);
			
			// some dash validators give a warning of an unknown atom 'udta', 
			// we don't need this user-defined-meta box.
			for(StreamSpec spec : specs) {
				if (!spec.enabled) continue;
				File initFile = useIdFolder ? 
					new File(outputFolder, spec.name+"/i.mp4") :
					new File(outputFolder, spec.name+"_i.mp4");
				if (BoxModifier.removeBox(initFile, initFile, "moov/udta"))
					logger.println("Removed moov/udta from " + initFile.getAbsolutePath() );

				// create an init.mp4 for livesim use(remove total duration atom)
				File outFile  = new File(outputFolder, useIdFolder ? 
						String.format("%s/i_%s.mp4", spec.name, "livesim") :
						String.format("%s_i_%s.mp4", spec.name, "livesim") );
				if (BoxModifier.removeBox(initFile, outFile, "moov/mvex/mehd"))
					logger.println("Removed moov/mvex/mehd from " + outFile.getAbsolutePath() );
			}
			
			// DASH: write encrypted segments+manifest if KID+KEY values are found
			if (DashDRM.hasParams(params)) {
				DashDRM drm = new DashDRM();
				drm.initParams(params);
				params.put("drm.created","1");
				
				logger.println("");
				drm.printParamsToLogger(logger);
				
				// delete old files from output folder
				File outputFolderDrm=new File(outputFolder, "drm/");  // write to drm/ subfolder
				outputFolderDrm.mkdir();
				if (Utils.getBoolean(params, "deleteoldfiles", true)) {
					deleteOldFiles(outputFolderDrm);
					if (useIdFolder) {
						for(StreamSpec spec : specs)
							deleteOldFiles( new File(outputFolderDrm, spec.name) );
					}					
				} else
					new File(outputFolder, "drm/manifest.mpd").delete();

				// create GPACDRM.xml drm specification file, write to workdir folder
				File specFileVideo=new File(outputFolder, "temp-gpacdrmvideo.xml");
				File specFileAudio=new File(outputFolder, "temp-gpacdrmaudio.xml");
				specFileVideo.delete();
				specFileAudio.delete();

				val=drm.createGPACDRM("video", Utils.getString(params, "drm.mode", "", true) ); // cenc,cbcs,cbcs0
				logger.println(val);
				FileOutputStream fos = new FileOutputStream(specFileVideo);
				try { fos.write(val.getBytes("UTF-8")); } finally { fos.close(); }					
				val=drm.createGPACDRM("audio", Utils.getString(params, "drm.mode", "", true) ); // cenc,cbcs,cbcs0
				logger.println(val);
				fos = new FileOutputStream(specFileAudio);
				try { fos.write(val.getBytes("UTF-8")); } finally { fos.close(); }
								
				// encrypt temp-v1.mp4 to drm/temp-v1.mp4
				logger.println("");				
				for(StreamSpec spec : specs) {
					if (!spec.enabled) continue;					
					args=MediaTools.getDashCryptArgs( spec.type.isAudio() ? specFileAudio : specFileVideo, 
						outputFolderDrm, spec, 
						mode==StreamSpec.TYPE.DASH? Utils.normalizePath(inputFile.getParent(),true)+"/" : "temp-" ); 
					logger.println(Utils.getNowAsString()+" "+ Utils.implodeList(args, " "));
					iobuffer=MediaTools.executeProcess(args, outputFolder); // run in workdir folder
				}

				// dash encrypted tracks
				args=MediaTools.getDashArgs(specs, (int)Utils.getLong(params, "segdur", 6), gopdur,
					timeLimit,
					Utils.getString(params, "init", "no", true), 
					(int)Utils.getLong(params, "sidx", 0),
					Utils.getString(params, "segname", "number", true),
					(int)Utils.getLong(params, "segver", 4),
					"temp-"
					, Utils.getString(params, "cmaf", "", true) // cmf2,cmfc,no
					);
				if(frags>=2) {
					// low-latency multi MOOF/MDAT (frags per segment)
					val = args.get(args.indexOf("-dash")+1);
					args.set(args.indexOf("-frag")+1, ""+(Integer.parseInt(val)/frags) ); // dash=384000 / 16 frags = 24000
				}

				logger.println(Utils.getNowAsString()+" "+ Utils.implodeList(args, " "));
				iobuffer=MediaTools.executeProcess(args, outputFolderDrm); // dash drm/temp-*.mp4 files

				// remove moov/trak/senc box from init segments, it breaks some of the hbbtv players,
				// create init.mp without any PSSH boxes, only Playready/Marlin/etc init files for testing use,
				for(StreamSpec spec : specs) {
					if (!spec.enabled) continue;
					File initFile = new File(outputFolder, useIdFolder ?
							"drm/"+spec.name+"/i.mp4" :
							"drm/"+spec.name+"_i.mp4");
					if (BoxModifier.removeBox(initFile, initFile, "moov/trak/senc"))
						logger.println("Removed moov/trak/senc from " + initFile.getAbsolutePath() );
					if (BoxModifier.removeBox(initFile, initFile, "moov/udta"))
						logger.println("Removed moov/udta from " + initFile.getAbsolutePath() );

					// create an init.mp4 for livesim use(remove total duration atom)
					File outFile  = new File(outputFolder, useIdFolder ? 
							String.format("drm/%s/i_%s.mp4", spec.name, "livesim") :
							String.format("drm/%s_i_%s.mp4", spec.name, "livesim") );
					if (BoxModifier.removeBox(initFile, outFile, "moov/mvex/mehd"))
						logger.println("Removed moov/mvex/mehd from " + outFile.getAbsolutePath() );
					
					outFile  = new File(outputFolder, useIdFolder ?
							"drm/"+spec.name+"/i_nopssh.mp4" :
							"drm/"+spec.name+"_i_nopssh.mp4");					
					if (BoxModifier.removeBox(initFile, outFile, "moov/pssh[*]"))
						logger.println(String.format("Removed moov/pssh[*] from %s to %s"
								, initFile.getAbsolutePath(), outFile.getAbsolutePath()) );

					for(String sysId : new String[] { "playready", "widevine", "marlin", "cenc" } ) {
						if (!Utils.getString(params, "drm."+sysId, "0", true).equals("0")) {
							outFile  = new File(outputFolder, useIdFolder ? 
								String.format("drm/%s/i_%s.mp4", spec.name, sysId) :
								String.format("drm/%s_i_%s.mp4", spec.name, sysId) );
							if (BoxModifier.keepPSSH(initFile, outFile, sysId))
								logger.println(String.format("Written moov/pssh[%s] from %s to %s"
									, sysId
									, initFile.getAbsolutePath(), outFile.getAbsolutePath()) );						
						}
					}
				}
				
				// fix manifest, add missing drmsystem namespaces
				manifestFile=new File(outputFolder, "drm/manifest.mpd");
				manifest = new DashManifest(manifestFile);
				manifest.fixContent(gopdur);
				manifest.setProfile(Utils.getString(params, "profile", "hbbtv15", true));
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
				if (!val.isEmpty()) {
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
					Utils.saveFile(new File(outputFolder, "drm/manifest_clearkey.mpd"), data.getBytes("UTF-8") );
				}

				// write CENC-clearkey manifest with just MPEG-CENC+EME-CENC(CLEARKEY) <ContentProtection> elements.
				if (!Utils.getString(params, "drm.cenc", "0", true).equals("0")) {
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
					Utils.saveFile(new File(outputFolder, "drm/manifest_cenc.mpd"), data.getBytes("UTF-8") );
				}

				// create manifest where init url points to vX_i_nopssh.mp4 files
				String data = manifestData.replace("initialization=\"$RepresentationID$_i.mp4\"", 
							"initialization=\"$RepresentationID$_i_nopssh.mp4\"");
				data = manifestData.replace("initialization=\"$RepresentationID$/i.mp4\"", 
						"initialization=\"$RepresentationID$/i_nopssh.mp4\"");
				Utils.saveFile(new File(outputFolder, "drm/manifest_nopssh.mpd"), data.getBytes("UTF-8"));

				// create single DRM manifests
				for(String sysId : new String[] { "playready", "widevine", "marlin" } ) {
					manifest = new DashManifest(manifestData);
					if (!sysId.equals("playready")) manifest.removeContentProtectionElement("playready");
					if (!sysId.equals("widevine"))  manifest.removeContentProtectionElement("widevine");
					if (!sysId.equals("marlin"))    manifest.removeContentProtectionElement("marlin");
					data = manifest.toString().replace("initialization=\"$RepresentationID$_i.mp4\"", 
								"initialization=\"$RepresentationID$_i_"+sysId+".mp4\"");
					data = manifest.toString().replace("initialization=\"$RepresentationID$/i.mp4\"", 
							"initialization=\"$RepresentationID$/i_"+sysId+".mp4\"");					
					Utils.saveFile(new File(outputFolder, "drm/manifest_"+sysId+".mpd"), data.getBytes("UTF-8"));					
				}
				
				if (Utils.getBoolean(params, "deletetempfiles", true)) {
					specFileVideo.delete();
					specFileAudio.delete();
					for(StreamSpec spec : specs)
						new File(outputFolder, "drm/temp-"+spec.name+".mp4").delete();
				}
			} // end-of-DRM-dash
			
			if (Utils.getBoolean(params, "deletetempfiles", true)
					&& mode!=StreamSpec.TYPE.DASH) {
				for(StreamSpec spec : specs)
					new File(outputFolder, "temp-"+spec.name+".mp4").delete();
			}

			// create subtitles(inband,outband), first call creates segment files
			// and DRM manifests points to the sub files.
			createSubtitlesInband(params, new File(outputFolder, "manifest.mpd"), 
					new File(outputFolder, "manifest_subib.mpd"), 
					true, "");
			createSubtitlesOutband(params, new File(outputFolder, "manifest.mpd"), 
					new File(outputFolder, "manifest_subob.mpd"), 
					true, "");			
			if (Utils.getBoolean(params, "drm.created", false)) {
				createSubtitlesInband(params, new File(outputFolder, "drm/manifest.mpd"), 
					new File(outputFolder, "drm/manifest_subib.mpd"), 
					false, "../");
				createSubtitlesOutband(params, new File(outputFolder, "drm/manifest.mpd"), 
						new File(outputFolder, "drm/manifest_subob.mpd"), 
						false, "../");				
			}
			
			iobuffer="";
			logger.println("");			
			logger.println(Utils.getNowAsString() + " Completed dashing");			
		} finally {
			if (logger!=null) {
				if(!iobuffer.isEmpty()) logger.println("iobuffer: "+iobuffer);
				logger.close();
			}
		}
	}

	public static int deleteOldFiles(File folder) throws IOException {
		int count=0;
		String exts[] = new String[] { ".m4s", ".mp4", ".mpd", ".jpg" };
		File[] files=folder.listFiles();
		if (files==null) return 0;
		for(File file : files) {
			if (file.isFile()) {
				String name = file.getName();
				for(int idx=0; idx<exts.length; idx++) {
					String ext=exts[idx];
					boolean del = ext.equals(".mp4") ?
						name.startsWith("temp-") && name.endsWith(ext) : // "temp-v1.mp4"
						name.endsWith(ext);  // "any.m4s"
					if(del) {
						file.delete();
						count++;
					}
				}
			}
		}
		return count;
	}

	private static void createSubtitlesInband(Map<String,String> params, File manifestFile, File manifestOutput,
				boolean splitSegments, String urlPrefix) throws Exception {
		// parse subib.X=sub_fin fin sub_fin.xml
		boolean isFirstSub=true;
		for(int idx=1; ; idx++) {
			String val = Utils.getString(params, "subib."+idx, "", true);
			if (val.isEmpty()) {
				if (idx<=5) continue; // try 1..5 then give up.
				else break;  
			}
			if (val.endsWith("disable")) continue;
			String[] valopts = val.split(" ");

			logger.println("Create subtitles(inband) "+val);			
			SubtitleInserter.insertIB(new File(valopts[2].trim()),	// input "sub_fin.xml" file path 
					isFirstSub?manifestFile:manifestOutput, 
					manifestOutput, 
					valopts[1].trim(),	// lang "fin"
					valopts[0].trim(),  // repId "sub_fin"
					splitSegments, // split xml file to sub_fin/sub_1.m4s segment files
					(int)Utils.getLong(params, "segdur", 6),
					Utils.getBoolean(params, "deletetempfiles", true), 
					urlPrefix,
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
			if (val.endsWith("disable")) continue;
			String[] valopts = val.split(" ");
	
			logger.println("Create subtitles(outband) "+val);			
			SubtitleInserter.insertOB(new File(valopts[2].trim()),	// input "sub_fin.xml" file path 
					isFirstSub?manifestFile:manifestOutput, 
					manifestOutput, 
					valopts[1].trim(),	// lang "fin"
					valopts[0].trim(),  // repId "sub_fin"
					copySubFile, // split xml file to sub_fin/sub_1.m4s segment files
					urlPrefix);
			isFirstSub=false;
		}
	}
	
}
