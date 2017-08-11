package hbbtv.org.refapp;

import java.util.*;
import java.io.*;

/**
 * MAIN CLASS: Transcode, Dash, DashEncrypt input video file.
 * Example command, output if current working directory:
 *   java -cp /refapp/lib/* hbbtv.org.refapp.Dasher config=dasher.properties logfile=manifest-log.txt drm.kid=rng drm.key=rng input=/videos/input.mp4 output=.
 */
public class Dasher {
	public static String NL = System.getProperty("line.separator", "\r\n");
	private static LogWriter logger;
	
	public static void main(String[] cmdargs) throws Exception {
		Map<String,String> params = Utils.parseParams(cmdargs);

		try {
			File inputFile = new File(params.get("input"));

			String val = Utils.normalizePath(Utils.getString(params, "output", "", true), true);
			if (val.isEmpty() || val.equals("/")) 
				throw new IllegalArgumentException("Invalid output value '" + val +"'");
			if (!val.endsWith("/")) val+="/";
			File outputFolder = new File(val);
			outputFolder.mkdirs();

			val = Utils.getString(params, "logfile", "", true);
			logger = new LogWriter();
			logger.openFile(val.isEmpty() ? null : new File(val));
			
			MediaTools.initTools(params.get("tool.ffmpeg"), params.get("tool.mp4box"));						

			logger.println(Utils.getNowAsString() + " Start dashing");
			logger.println("input="  + Utils.normalizePath(inputFile.getAbsolutePath(), true) );
			logger.println("output=" + Utils.normalizePath(outputFolder.getAbsolutePath(), true) );

			// delete old files from output folder (seg0.m4s,init.mp4, temp-*.mp4 files?)
			new File(outputFolder, "manifest.mpd").delete();

			
			Map<String,String> meta = MediaTools.readMetadata(inputFile);			
			for(String key : meta.keySet())
				logger.println(key+"="+meta.get(key));
			
			int fps = (int)Utils.getLong(meta, "videoFPS", 25);
			int gopdur = (int)Utils.getLong(params, "gopdur", 3); // GOP duration in seconds
			String overlayOpt = Utils.getString(params, "overlay", "0", true); // 1=enabled, 0=disabled 

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
						MediaTools.executeProcess(args, outputFolder);				
				}
			}
			
			List<StreamSpec> specs=new ArrayList<StreamSpec>();

			// transcode video.1,video.2,.. output streams
			// name size bitrate: v1 640x360 512k
			logger.println("");			
			for(int idx=1; ; idx++) {
				val = Utils.getString(params, "video."+idx, "", true);
				if (val.isEmpty()) break;
				String[] valopts = val.split(" ");
				StreamSpec spec = new StreamSpec();
				spec.type = StreamSpec.TYPE.VIDEO_H264;
				spec.name = valopts[0].trim();
				spec.size = valopts[1].trim();
				spec.bitrate = valopts[2].trim();
				specs.add(spec);

				List<String> args=MediaTools.getTranscodeH264Args(inputFile, spec, fps, gopdur, overlayOpt);
				logger.println(Utils.getNowAsString()+" "+ Utils.implodeList(args, " "));
				if (!val.endsWith("disable"))
					MediaTools.executeProcess(args, outputFolder);
					//String buf = MediaTools.executeProcess(args, outputFolder);
					//if (NL.length()>1) buf=buf.replace("\n", NL); 
					//println(buf);
			}

			// transcode audio.1,audio.2,.. output streams
			// name samplerate bitrate channels: a1 48000 128k 2
			logger.println("");			
			for(int idx=1; ; idx++) {
				val = Utils.getString(params, "audio."+idx, "", true);
				if (val.isEmpty()) break;
				String[] valopts = val.split(" "); 
				StreamSpec spec = new StreamSpec();
				spec.type = StreamSpec.TYPE.AUDIO_AAC;
				spec.name = valopts[0].trim();
				spec.sampleRate = Integer.parseInt(valopts[1].trim());
				spec.bitrate = valopts[2].trim();
				spec.channels = Integer.parseInt(valopts[3].trim());
				specs.add(spec);
				
				List<String> args=MediaTools.getTranscodeAACArgs(inputFile, spec);
				logger.println(Utils.getNowAsString()+" "+ Utils.implodeList(args, " "));
				if (!val.endsWith("disable"))
					MediaTools.executeProcess(args, outputFolder);
			}
			
			// DASH: write unencypted segments+manifest
			logger.println("");
			List<String> args=MediaTools.getDashH264Args(specs, (int)Utils.getLong(params, "segdur", 6));
			logger.println(Utils.getNowAsString()+" "+ Utils.implodeList(args, " "));
			MediaTools.executeProcess(args, outputFolder);
			
			// Fix some of the common manifest problems after mp4box tool
			DashManifest manifest = new DashManifest(new File(outputFolder, "manifest.mpd"));
			manifest.fixContent();
			manifest.save( new File(outputFolder, "manifest.mpd") );
			
			// DASH: write encrypted segments+manifest if KID+KEY values are found
			if (!Utils.getString(params, "drm.kid", "", true).isEmpty() &&
					!Utils.getString(params, "drm.key", "", true).isEmpty()) {
				DashDRM drm = new DashDRM();
				drm.initParams(params);
				
				logger.println("");
				logger.println("drm.kid="+params.get("drm.kid"));
				logger.println("drm.key="+params.get("drm.key"));
				logger.println("drm.iv="+params.get("drm.iv"));
				
				// delete old files from output folder (seg0.m4s,init.mp4, temp-*.mp4 files?)
				File outputFolderDrm=new File(outputFolder, "drm/");  // write to drm/ subfolder
				outputFolderDrm.mkdir();
				new File(outputFolder, "drm/manifest.mpd").delete();

				// create GPACDRM.xml drm specification file, write to workdir folder
				File specFile=new File(outputFolder, "temp-gpacdrm.xml");
				specFile.delete();
				val=drm.createGPACDRM();				
				logger.println(val);
				FileOutputStream fos = new FileOutputStream(specFile);
				try { fos.write(val.getBytes("UTF-8")); } finally { fos.close(); }
				
				// encrypt temp-v1.mp4 to drm/temp-v1.mp4
				logger.println("");				
				for(StreamSpec spec : specs) {
					args=MediaTools.getDashCryptArgs(specFile, outputFolderDrm, spec); 
					logger.println(Utils.getNowAsString()+" "+ Utils.implodeList(args, " "));
					MediaTools.executeProcess(args, outputFolder); // run in workdir folder
				}

				// dash encrypted segments
				args=MediaTools.getDashH264Args(specs, (int)Utils.getLong(params, "segdur", 6));
				logger.println(Utils.getNowAsString()+" "+ Utils.implodeList(args, " "));
				MediaTools.executeProcess(args, outputFolderDrm); // dash drm/temp-*.mp4 files

				// fix manifest, add missing drmsystem namespaces
				manifest = new DashManifest(new File(outputFolder, "drm/manifest.mpd"));
				manifest.fixContent();
				manifest.addNamespaces();
				
				// add <ContentProtection> elements, remove CENC element if was disabled
				val=drm.createPlayreadyMPDElement();
				if (!val.isEmpty())
					manifest.addContentProtectionElement(val);
				val=drm.createWidevineMPDElement();
				if (!val.isEmpty())
					manifest.addContentProtectionElement(val);
				val=drm.createMarlinMPDElement();
				if (!val.isEmpty())
					manifest.addContentProtectionElement(val);
				if (Utils.getString(params, "drm.cenc", "0", true).equals("0"))
					manifest.removeContentProtectionElement("cenc");

				manifest.save( new File(outputFolder, "drm/manifest.mpd") );
				
				if (Utils.getBoolean(params, "deletetempfiles", true)) {
					specFile.delete();
					for(StreamSpec spec : specs)
						new File(outputFolder, "drm/temp-"+spec.name+".mp4").delete();
				}
			}

			if (Utils.getBoolean(params, "deletetempfiles", true)) {
				for(StreamSpec spec : specs)
					new File(outputFolder, "temp-"+spec.name+".mp4").delete();
			}
			
			logger.println("");			
			logger.println(Utils.getNowAsString() + " Completed dashing");			
		} finally {
			logger.close();
		}
	}

}
