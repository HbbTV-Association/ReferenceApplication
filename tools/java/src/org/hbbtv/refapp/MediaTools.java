package org.hbbtv.refapp;

import java.io.*;
import java.util.*;

/**
 * Utilify functions for executable tools used by dasher (ffmpeg,ffprobe,mp4box).
 */
public class MediaTools {
	private static String FFPROBE;
	private static String FFMPEG;
	private static String MP4BOX;
	
	public static void initTools(String ffmpeg,  String mp4box) {
		// set system-wide default values 
		String ext = Utils.isWindows() ? ".exe" : "";
		FFPROBE = "ffprobe"+ext;
		FFMPEG  = "ffmpeg"+ext;
		MP4BOX  = "MP4Box"+ext;
		
		// ffmpeg=c:/apps/ffmpeg/bin/ffmpeg.exe
		if (ffmpeg!=null && !ffmpeg.isEmpty()) {
			FFMPEG = ffmpeg;
			int delim=FFMPEG.lastIndexOf('/');
			FFPROBE = delim>0  ? 
					FFMPEG.substring(0, delim)+"/ffprobe"+ext :
					delim==0 ? "/ffprobe"+ext :
					FFPROBE;
		}

		// mp4box=c:/apps/gpac/MP4Box.exe
		if (mp4box!=null && !mp4box.isEmpty()) 
			MP4BOX = mp4box;		
	}

	public static List<String> getTranscodeH264Args(File file, StreamSpec spec, 
				int fps, int gopdur, String overlayOpt) {
		// "C:\apps\refapp\tools\java\lib" -> "/apps/refapp/tools/java/lib"
		String libFolder = Utils.getLibraryFolder(MediaTools.class);
		libFolder = Utils.normalizePath(libFolder, true);
		if (libFolder.charAt(1)==':') libFolder = libFolder.substring(2);

		String inputFile = Utils.normalizePath(file.getAbsolutePath(), true);

		int gop = fps*gopdur;
		List<String> args=Arrays.asList(FFMPEG, 
			"-hide_banner", "-nostats",
			"-i", inputFile,
			"-threads", "4", "-preset", "fast",
			"-c:v", "libx264", 
			"-profile:v", spec.profile.isEmpty()?"main":spec.profile, 
			"-level", spec.level.isEmpty()?"4.0":spec.level,
			"-s:v", spec.size, 		// resolution 1920x1080
			"-b:v", spec.bitrate, 	// video bitrate 2000k
			//"-maxrate:v", spec.bitrate,
			//"-bufsize:v", spec.bitrate,
			"-pix_fmt", "yuv420p",	// use most common pixel format for best compatibility
			"-refs", "3",			// reference frames
			"-bf", "3",				// max number of bframes
			"-g", ""+gop,			// GOP frames (fps=25, gopdur=3 -> gop=75)
			"-keyint_min", ""+fps,	// I-Frame interval (keyframes)
			"-b_strategy", "1",		// BPyramid strategy
			"-flags", "+cgop",		// use ClosedGOP
			"-sc_threshold", "0",	// disable Scenecut
			"-vf", "${overlayOpt}",	// draw overlay text on video (optional)
			"-an", "-y", "temp-"+spec.name+".mp4"  // skip audio, overwrite output file
		);
		args = new ArrayList<String>(args); // create modifiable list

		updateOverlayOpt(args, spec, fps, gop, overlayOpt, libFolder);		
		return args;
	}

	public static List<String> getTranscodeH265Args(File file, StreamSpec spec, 
			int fps, int gopdur, String overlayOpt) {
		// "C:\apps\refapp\tools\java\lib" -> "/apps/refapp/tools/java/lib"
		String libFolder = Utils.getLibraryFolder(MediaTools.class);
		libFolder = Utils.normalizePath(libFolder, true);
		if (libFolder.charAt(1)==':') libFolder = libFolder.substring(2);
	
		String inputFile = Utils.normalizePath(file.getAbsolutePath(), true);

		// must also use x265-params custom argument to give a common ffmpeg args (ref,bf,g,keyint,etc..)
		String level = spec.level.isEmpty()?"5.0":spec.level;
		int gop = fps*gopdur;
		List<String> args=Arrays.asList(FFMPEG, 
			"-hide_banner", "-nostats",
			"-i", inputFile,
			"-threads", "4", "-preset", "fast",
			"-c:v", "libx265", 
			"-level", level,// profile=main(8bit) is given in x265-params
			"-s:v", spec.size, 		// resolution 3840x2160
			"-b:v", spec.bitrate, 	// video bitrate 2000k
			//"-maxrate:v", spec.bitrate,
			//"-bufsize:v", spec.bitrate,
			//"-pix_fmt", "yuv420p",	// use most common pixel format for best compatibility
			"-refs", "3",			// reference frames
			"-bf", "3",				// max number of bframes
			"-g", ""+gop,			// GOP frames (fps=25, gopdur=3 -> gop=75)
			"-keyint_min", ""+fps,	// I-Frame interval (keyframes)
			"-b_strategy", "1",		// BPyramid strategy
			"-flags", "+cgop",		// use ClosedGOP
			"-sc_threshold", "0",	// disable Scenecut
			"-x265-params", "profile=${profile}:level_idc=${level}:min-keyint=${fps}:keyint=${gop}:vbv-bufsize=${bitrate}:ref=3:bframes=3:b-adapt=1:no-open-gop=1:scenecut=0:b-pyramid=0",
			"-vf", "${overlayOpt}",	// draw overlay text on video (optional)
			"-an", "-y", "temp-"+spec.name+".mp4"  // skip audio, overwrite output file
		);
		args = new ArrayList<String>(args); // create modifiable list

		int idx= args.indexOf("-x265-params")+1;
		args.set(idx, args.get(idx)
				.replace("${profile}", spec.profile.isEmpty()?"main":spec.profile)
				.replace("${level}", level)
				.replace("${fps}", ""+fps)
				.replace("${gop}", ""+gop)
				.replace("${bitrate}", spec.bitrate)
				);
		
		updateOverlayOpt(args, spec, fps, gop, overlayOpt, libFolder);
		return args;
	}
	
	public static List<String> getTranscodeAACArgs(File file, StreamSpec spec) {
		String inputFile = Utils.normalizePath(file.getAbsolutePath(), true);
		
		List<String> args=Arrays.asList(FFMPEG, 
			"-hide_banner", "-nostats",
			"-i", inputFile,
			"-threads", "4",
			"-c:a", "aac", "-strict", "experimental",
			"-b:a", spec.bitrate, 		// audio bitrate 128k
			"-maxrate:a", spec.bitrate, "-bufsize:a", spec.bitrate,
			"-af", "aresample="+ spec.sampleRate, // rate 48000, 44100
			"-ar", ""+spec.sampleRate,
			"-ac", ""+spec.channels,	// channel count 2..n
			"-vn", "-y", "temp-"+spec.name+".mp4"  // skip video, overwrite output file
		);
		args = new ArrayList<String>(args);
		return args;
	}
	
	public static List<String> getDashArgs(List<StreamSpec> specs, int segdur) {
		// Use MDP.minBufferTime=segdur*2 to make validator happy, default 1.5sec-3sec 
		// value most likely gives "buffer underrun" warnings.
		//    http://dashif.org/conformance.html
		List<String> args=Arrays.asList(MP4BOX,
			"-dash", ""+(segdur*1000), 	// segment duration 6sec*1000
			"-frag", ""+(segdur*1000),
			"-mem-frags", "-rap",
			"-profile", "dashavc264:live",
			"-profile-ext", "urn:hbbtv:dash:profile:isoff-live:2012",
			"-min-buffer", ""+(segdur*1000*2), //  "3000", // MDP.minBufferTime value
			"-mpd-title", "refapp", "-mpd-info-url", "http://refapp",
			"-bs-switching", "no",
			"-sample-groups-traf", "-single-traf", "-subsegs-per-sidx", "1", // SIDX table with 1 fragment
			"-segment-name", "$RepresentationID$_$Number$$Init=i$", "-segment-timeline",
			"-out", "manifest.mpd"	// output file
		);
		args = new ArrayList<String>(args);
		
		for(StreamSpec spec : specs) {
			if (!spec.enabled) continue;
			String arg="temp-${name}.mp4#trackID=1:id=${name}:period=p0";
			arg = arg.replace("${name}", spec.name);
			args.add(arg);
		}
		
		return args;
	}

	/**
	 * Convert H265(HEV1) to H265(HVC1) media file.
	 * @param outputFolder	working directory
	 * @param spec
	 * @throws IOException
	 */
	public static void convertHEV1toHVC1(File outputFolder, StreamSpec spec) throws IOException {
		String inputFile = "temp-"+spec.name+".mp4";
		String outputFile= "temp-"+spec.name+".hvc";
		File iFile = new File(outputFolder, inputFile);
		File oFile = new File(outputFolder, outputFile);
		
		oFile.delete();
		List<String> args=Arrays.asList(MP4BOX,
			"-raw", "1", inputFile,	// input:  temp-v1.mp4
			"-out", outputFile		// output: temp-v1.hvc
		);
		executeProcess(args, outputFolder);
		if (!oFile.exists())
			throw new IOException("HEV1 to HVC1 conversion failed, " + inputFile);

		iFile.delete();
		args=Arrays.asList(MP4BOX,
			"-add", outputFile,	// input:  temp-v1.hvc
			inputFile			// output: temp-v1.mp4
		);
		executeProcess(args, outputFolder);
		if (!iFile.exists())
			throw new IOException("HEV1 to HVC1 conversion failed, " + outputFile);
		oFile.delete(); // delete temporary temp-v1.hvc file
	}	
	
	public static List<String> getDashCryptArgs(File drmspecFile, File outputFolder, StreamSpec spec) {
		String streamFile = "temp-"+spec.name+".mp4";
		List<String> args=Arrays.asList(MP4BOX,
			"-crypt", Utils.normalizePath(drmspecFile.getAbsolutePath(), true), // drm/drmspec.xml input file
			streamFile, // input unencrypted stream file
			"-out", Utils.normalizePath(outputFolder.getAbsolutePath(), true)+"/"+streamFile
		);
		args = new ArrayList<String>(args);
		return args;
	}

	public static List<String> getImageArgs(File file, int timeSec, String size) {
		String inputFile = Utils.normalizePath(file.getAbsolutePath(), true);		
		List<String> args=Arrays.asList(FFMPEG, 
			"-hide_banner", "-nostats",
			"-i", inputFile,
			"-ss", ""+timeSec,		// timestamp seconds where image is taken from (1..n)
			"-vf", "scale="+size,	// 640x360
			"-qscale:v", "5",
			"-vframes", "1",
			"-an", "-y", "image_"+size+".jpg" 
		);
		args = new ArrayList<String>(args);
		return args;
	}

	public static List<String> getSubIBTempMp4Args(File subFile, File outputFile, String id) {
		List<String> args=Arrays.asList(MP4BOX,
				"-add", ""+subFile.getAbsolutePath()+":ext=ttml",
				"-new", outputFile.getAbsolutePath()
		);
		args = new ArrayList<String>(args);
		return args;
	}

	public static List<String> getSubIBSegmentsArgs(File subFile, String id, int segdur) {
		List<String> args=Arrays.asList(MP4BOX,
				"-dash", ""+(segdur*1000),
				"-mem-frags",
				"-profile", "dashavc264:live",
				"-bs-switching", "no",
				"-sample-groups-traf", "-single-traf", "-subsegs-per-sidx", "1",
				"-segment-name", "$RepresentationID$/sub_$Number$$Init=i$",
				"-out", subFile.getAbsolutePath().replace(".mp4", ".mpd"), // output output/temp-sub_xxx.mpd
				subFile.getAbsolutePath()+":id="+id	// input output/temp-sub_xxx.mp4
		);
		args = new ArrayList<String>(args);
		return args;
	}

	/**
	 * Run executable process.
	 * @param args	first element is a command, remaining values are arguments.
	 * @param workdir	working directory used by the process
	 * @return  Output string of the executable
	 * @throws IOException
	 */
	public static String executeProcess(List<String> args, File workdir) throws IOException {
		ProcessBuilder exec = new ProcessBuilder(args);
		exec.redirectErrorStream(true);
		exec.directory(workdir);
		return readSTDIN(exec.start());
	}
	
	/**
	 * Read metadata from video file.
	 * @param file
	 * @return
	 * @throws IOException
	 * @throws InterruptedException
	 */
	public static Map<String,String> readMetadata(File file) throws IOException, InterruptedException {
		String inputFile = Utils.normalizePath(file.getAbsolutePath(), true);
		
		ProcessBuilder exec = new ProcessBuilder((String)null);
		exec.redirectErrorStream(true);
		exec.directory(null); // use current working dir
		
		exec.command(Arrays.asList(new String[] {
				FFPROBE,
				"-v", "quiet",
				"-print_format", "flat",	// flat,json,ini,xml
				"-show_format", "-show_streams",
				"-i", inputFile
			}));		

		// convert FFPROBE props to internal meta props,
		// this always reads first Video+Audio streams from input file.
		String value;
		Map<String,String> meta = new LinkedHashMap<>();		
		Map<String,String> props = Utils.createMap( readSTDIN(exec.start()) );
		for(int idx=0; ;idx++) {
			value = props.get("streams.stream."+idx+".codec_type");
			if (value==null || value.isEmpty()) break;
			if (value.equals("video") && !meta.containsKey("videoIndex")) {
				meta.put("videoIndex", ""+idx);
				meta.put("videoCodec", props.get("streams.stream."+idx+".codec_name") ); // h264,prores
				meta.put("videoCodecTag", props.get("streams.stream."+idx+".codec_tag_string") ); // avc1,apch
				meta.put("videoWidth", props.get("streams.stream."+idx+".width") );		// 720/576=frameaspect
				meta.put("videoHeight", props.get("streams.stream."+idx+".height") );
				meta.put("videoPAR", props.get("streams.stream."+idx+".sample_aspect_ratio") ); // 12/11 pixelaspect
				meta.put("videoDAR", props.get("streams.stream."+idx+".display_aspect_ratio") ); // 15/11, dar=par*frameaspect 
				meta.put("videoDuration", props.get("streams.stream."+idx+".duration") ); // 60.040000  sec.millis
				meta.put("videoPixFormat", props.get("streams.stream."+idx+".pix_fmt") ); // yuv420p, yuv422p10le

				value = props.get("streams.stream."+idx+".bit_rate");
				if (value==null || value.isEmpty() || value.equalsIgnoreCase("N/A")) 
					value = props.get("streams.stream."+idx+".max_bit_rate");
				if (value==null || value.equalsIgnoreCase("N/A")) value="";
				meta.put("videoBitrate", value); // bit/s (512000=512Kbit/s)

				value = props.get("streams.stream."+idx+".r_frame_rate"); // 25/1, 24/1, 30000/1001
				if (value==null) value = "25/1";
				if (value.endsWith("/1")) value = value.substring(0, value.length()-2); 
				else {
					int delim = value.indexOf('/');
					if (delim<1) value="";
					else {
						double fps = Double.parseDouble(value.substring(0, delim)) / Double.parseDouble(value.substring(delim+1));
						value = String.format("%.4g%n", fps); // 29.9700
					}
				}
				meta.put("videoFPS", value);
			} else if (value.equals("audio") && !meta.containsKey("audioIndex")) {
				meta.put("audioIndex", ""+idx);
				meta.put("audioCodec", props.get("streams.stream."+idx+".codec_name") ); // aac, eac3, pcm_s24le
				meta.put("audioCodecTag", props.get("streams.stream."+idx+".codec_tag_string") ); // mp4a, ec-3, lpcm 				
				meta.put("audioChannels", props.get("streams.stream."+idx+".channels") ); // 2, 6
				meta.put("audioChannelLayout", props.get("streams.stream."+idx+".channel_layout") ); // stereo, 5.1(side)
				meta.put("audioRate", props.get("streams.stream."+idx+".sample_rate") ); // 48000=48KHz, 44100=44.1KHz
				meta.put("audioDuration", props.get("streams.stream."+idx+".duration") ); // 60.040000  sec.millis

				value = props.get("streams.stream."+idx+".bit_rate");
				if (value==null || value.isEmpty() || value.equalsIgnoreCase("N/A")) 
					value = props.get("streams.stream."+idx+".max_bit_rate");
				if (value==null || value.equalsIgnoreCase("N/A")) value="";
				meta.put("audioBitrate", value); // bit/s (128000=128Kbit/s)
			}
		}
		
		meta.put("filesize", ""+file.length());

		value = meta.get("videoDuration");
		if (value==null || value.isEmpty())
			value = meta.get("audioDuration");
		if (value==null || value.isEmpty())
			value = props.get("format.duration");
		if (value==null) value="";
		
		meta.put("duration", value); // seconds.millis=1567.893333 
		if (!value.isEmpty()) {
			int delim = value.indexOf('.');
			if (delim>0) value = value.substring(0, delim);
			meta.put("durationhms", Utils.serialToTime(Integer.parseInt(value)) ); // HH:MM:SS
			meta.put("durationsec", value);
		}

		value = props.get("format.bit_rate");
		if (value==null || value.equalsIgnoreCase("N/A")) value="";
		meta.put("bitrate", value); // 3958196

		value = props.get("format.format_name");
		if (value==null || value.equalsIgnoreCase("N/A")) value="";
		meta.put("fileFormat", value); // "mpegts", "mov,mp4,m4a,3gp,3g2,mj2"

		// read interlace/progressive flag
		// TODO: this is not 100% accurate but should do fine for now.
		if (meta.containsKey("videoIndex")) {
			exec.command(
				Arrays.asList(new String[] {
						FFMPEG,
						"-i", inputFile,
						"-nostats",
						"-filter:v", "idet",	// interlace detection filter
						"-frames:v", "1000",	// read n frames then stop
						"-an", "-f", "null",	// no audio
						"-"	// output STDERR
				}));
			value = readSTDIN(exec.start());
			int delimS = value.indexOf("Parsed_idet_");
			value = delimS>0 ? value.substring(delimS) : "";			
		} else value = "";
		
		int tff = parseIdetFrameCount(value, "Single frame detection", "TFF")
				+ parseIdetFrameCount(value, "Multi frame detection", "TFF");
		int bff = parseIdetFrameCount(value, "Single frame detection", "BFF")
				+ parseIdetFrameCount(value, "Multi frame detection", "BFF");
		int prf = parseIdetFrameCount(value, "Single frame detection", "Progressive")
				+ parseIdetFrameCount(value, "Multi frame detection", "Progressive");
		meta.put("interlaceMode",
				tff+bff>prf ? tff>bff ? "TFF":"BFF" : "PRF"); // TopFieldFirst, BottomFieldFirst, Progressive
		meta.put("interlaceModeTFF", String.valueOf(tff));
		meta.put("interlaceModeBFF", String.valueOf(bff));
		meta.put("interlaceModePRF", String.valueOf(prf));

		return meta;
	}

	private static int parseIdetFrameCount(String output, String title, String field) {
		int delimS = output.indexOf(title+":");
		if (delimS<0) return 0;

		// output= "TFF:   12 BFF:  0 Progressive:    0 Undetermined    0"
		delimS=output.indexOf(':', delimS)+1;
		int delimE = output.indexOf('\n', delimS);
		output = delimE>0 ? output.substring(delimS, delimE) : "";   

		delimS = output.indexOf(field+":");		
		int delimDigit=-1;
		for(delimE=delimS+field.length()+1; delimE<output.length(); delimE++) {
			char ch = output.charAt(delimE);
			if (ch==' ') {
				if (delimDigit>0)
					return Integer.parseInt(output.substring(delimDigit, delimE));
			} else if (delimDigit<0)
				delimDigit=delimE; // first digit char
		}
		return 0;
	}

	/**
	 * Read process input stream and close streams (STDIN, STDERR, STDOUT).
	 * @param execp
	 * @return
	 * @throws IOException
	 */
	private static String readSTDIN(Process execp) throws IOException {
		BufferedReader reader = new BufferedReader(new InputStreamReader(execp.getInputStream()));
		StringBuilder builder = new StringBuilder();
		String line = null;
		while ( (line = reader.readLine()) != null) {
		   builder.append(line);
		   builder.append('\n');
		}
		execp.getInputStream().close();
		execp.getErrorStream().close();
		execp.getOutputStream().close();
		return builder.toString();
	}

	private static int updateOverlayOpt(List<String> args, StreamSpec spec, int fps, int gop, String overlayOpt, String libFolder) {
		int argIdx=args.indexOf("${overlayOpt}");
		if (argIdx>0) {
			if (overlayOpt.equals("1")) {
				String arg="fontfile=${libFolder}/Roboto-Regular.ttf:fontcolor=White:fontsize=38:box=1:boxcolor=black:x=(w-text_w)/2:y=text_h-line_h+60"
						+ ":text='${mode} ${size} ${bitrate} ${fps}fps ${gop}gop \\ ':timecode='00\\:00\\:00\\:00':rate=${fps}";
				arg = arg.replace("${size}", spec.size)
					.replace("${mode}", spec.getCodec())	// H264,H265 substring
					.replace("${bitrate}", spec.bitrate)
					.replace("${fps}", ""+fps)
					.replace("${gop}", ""+gop)
					.replace("${libFolder}", libFolder);
				if (spec.getWidth()>2500)
					arg=arg.replace("fontsize=38", "fontsize=60"); // use larger font for 3840x2160 image
				args.set(argIdx, "drawtext="+arg);
			} else {
				args.remove(argIdx);	// remove $overlayOpt arg
				args.remove(argIdx-1);  // remove previous "-vf" videofilter arg
				argIdx=-1;
			}
		}
		return argIdx;
	}
	
}
