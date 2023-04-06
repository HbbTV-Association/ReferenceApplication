package org.hbbtv.refapp;

import java.io.File;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Utility functions for executable tools used by dasher (ffmpeg,ffprobe,mp4box).
 */
public class MediaTools2 {
	
	/**
	 * Create images
	 * @param file		input video
	 * @param timeSec	seconds 0..n timestamp
	 * @param sizes		array of widthxheight (640x360)
	 * @param format	"png" or "jpeg"
	 * @param outFilename	output file "image_{w}x{h}.jpg"
	 * @return
	 */
	public static List<String> getImageArgs(File file, int timeSec,
			List<String> sizes, String format, String outFilename) {
		String inputFile = Utils.normalizePath(file.getAbsolutePath(), true);
		List<String> args= new ArrayList<String>(24);
		args.addAll(Arrays.asList(MediaTools.FFMPEG, 
			"-hide_banner", "-nostats", "-ignore_unknown", 
			"-fflags", "+discardcorrupt",
			"-analyzeduration", "600000000", "-probesize", "600000000",
			"-ss", ""+timeSec,		// timestamp seconds an image is taken at (1..n)
			"-i", inputFile
			//,"-ss", ""+timeSec    // slow after -i
			//,"-preset", "ultrafast"
		));

		// select I-frames only, split to N output, scale output
		String stempH= String.format("[0:v:0]select=eq(pict_type\\,I),split=%d", sizes.size());
		String stemp = "";
		for(int idx=0; idx<sizes.size(); idx++) {
			String item = sizes.get(idx); // "640x360", "1280x720"
			stempH += String.format("[s%d]", idx);
			stemp  += String.format("[s%d]scale=%s[v%d]; ", idx, item, idx);
		}
		stemp=stempH+"; "+stemp.substring(0,stemp.length()-2); // drop trailing "; "
		args.addAll(Arrays.asList(
			"-filter_complex", stemp, "-an", "-sn", "-y"
		));

		if(format.isEmpty()) // "png","jpeg" 
			format = outFilename.toLowerCase(Locale.US).endsWith(".png") ? "png" : "jpeg";
		
		String outFormat = format.equals("png") ? "frame2" : "mjpeg";
		for(int idx=0; idx<sizes.size(); idx++) {
			String[] item = sizes.get(idx).split("x"); // "640x360", "1280x720"
			args.addAll(Arrays.asList(				
				"-map", String.format("[v%d]", idx), 
				"-vframes:v", "1",
				"-q:v", "5", // quality 2..31 (best to worst)
				"-f", outFormat,
				outFilename.replace("{w}", item[0]) // "image_{w}x{h}.jpg""
					.replace("{h}", item[1])
			));
		}				
		
		return args;
	}

	/**
	 * H264 encoding with CRF value
	 * @return
	 */
	public static List<String> getTranscodeH264Args(StreamSpec spec, 
			int fps, boolean forceFps, int gopdur, int segdur, 
			String overlayOpt, long timeLimit) {
		String inputFile = Utils.normalizePath(spec.inputFile.getAbsolutePath(), true);
		String outputFile= spec.inputFileTrack.getName(); //Utils.normalizePath(spec.inputFileTrack.getAbsolutePath(), true);

		String bufSuffix= spec.bitrate.substring(spec.bitrate.length()-1); // "1024k"->"k" 
		String bufSize  = spec.bitrate.substring(0, spec.bitrate.length()-1); // "1024k"->"1024"
		bufSize         = (Integer.parseInt(bufSize)*2)+bufSuffix; // "1024k * 2"->"2048k"

		// the following GOPs align with AAC/48000Hz(1024 packet size)
		// 25fps, 3,84s -> 96 vframes,  180 aframes (48000*3,84/1024)
		// 25fps, 8s    -> 200 vframes, 374 aframes
		// 50fps, 3,84s -> 192 vframes
		// 30fps, 3,20s -> 96 vframes, 150 aframes
		// 30fps, 4,80s -> 144 vframes
		// 60fps, 4,80s -> 288 vframes
		// the following values do not 100% align audio segments to the video segdur
		// 25fps, 2s    -> 50 vframes, 93,74 aframes
		// 30fps, 2s    -> 60 vframes

		// gopdur=milliseconds(3840,2000), gop=number of video frames
		int gop   = fps * gopdur / 1000;
		int keyMin= gop / 2;
		
		List<String> args = new ArrayList<String>(32);		
		args.addAll(Arrays.asList(MediaTools.FFMPEG, 
			"-hide_banner", "-nostats", "-ignore_unknown", 
			"-fflags", "+discardcorrupt",
			"-analyzeduration", "600000000", "-probesize", "600000000",			
			"-i", inputFile,
			"-threads", "4", "-preset", "fast",
			"-c:v", "libx264", "-crf", spec.crf, // ConstantRateFactor 
			"-profile:v", spec.profile.isEmpty()?"main":spec.profile, 
			"-level", spec.level.isEmpty()?"4.0":spec.level,
			//"-s:v", spec.size, 		// resolution 1920x1080, replaced by swscale filter
			"-maxrate:v", spec.bitrate, // max rate for crf
			"-bufsize:v", bufSize,      // 2*bitrate
			"-pix_fmt", "yuv420p",	// use most common pixel format for best compatibility
			"-r", forceFps ? ""+fps:"$DEL2$",
			"-refs", "3",			// reference frames
			"-bf", "3",				// max number of bframes between ref frames
			"-g", ""+gop,           // GOP frames
			"-keyint_min", ""+keyMin,	// I-Frame interval (keyframes)			
			"-b_strategy", "1",		// adaptive num of bframes BPyramid strategy
			"-flags", "+cgop",		// use ClosedGOP
			"-sc_threshold", "0",	// disable Scenecut
			// allow negative MOOF/TRUN.CompositionTimeOffset(use s32bit, no u32bit) 
			"-movflags", "negative_cts_offsets+faststart", 
			"-vf", "${overlay,scale}",	// draw overlay text on video (optional), swscale
			"-color_range", "tv",	// limited(tv), full(pc) rgb range, signal range
			"-colorspace", "bt709", // RGB to YUV colormatrix
			"-color_primaries", "bt709", // RGB map to real values
			"-color_trc", "bt709",  // transfer function RGB or YUV to display luminance 
			"-an", "-sn",			// skip audio, skip subtitles track
			"-metadata:s:v:0", !spec.lang.isEmpty() ? "language="+spec.lang : "$DEL2$",
			"-t", "${timelimit}",	// read X seconds then stop encoding
			"-y", outputFile        // overwrite output file "temp-v1.mp4"
		));
	
		// use full internal YUV444 + accurate rounding: flags=full_chroma_int+accurate_rnd 
		String scale   = "scale="+spec.size+":out_range=tv:out_color_matrix=bt709:flags=full_chroma_int+accurate_rnd";
		String format  = "format=yuv420p,setsar=1/1"; // StorageAspectRatio(1:1)
		String overlay = MediaTools.getOverlayOpt(spec, fps, gop, segdur, overlayOpt);
		String val     = overlay+","+scale+","+format;
		args.set(args.indexOf("${overlay,scale}"), val.charAt(0)==','?val.substring(1):val);
		
		MediaTools.updateOpt(args, "${timelimit}", timeLimit>0 ? String.valueOf(timeLimit) : null, true);
		MediaTools.removeEmptyOpt(args);
		return args;
	}

	/**
	 * H264 encoding with CRF value
	 * @return
	 */
	public static List<String> getTranscodeH265Args(StreamSpec spec, 
			int fps, boolean forceFps, int gopdur, int segdur, 
			String overlayOpt, long timeLimit) {
		String inputFile = Utils.normalizePath(spec.inputFile.getAbsolutePath(), true);
		String outputFile= spec.inputFileTrack.getName(); //Utils.normalizePath(spec.inputFileTrack.getAbsolutePath(), true);

		String bufSuffix= spec.bitrate.substring(spec.bitrate.length()-1); // "1024k"->"k" bitrate should always be "k" suffix
		String bufSize  = spec.bitrate.substring(0, spec.bitrate.length()-1); // "1024k"->"1024"
		bufSize         = (Integer.parseInt(bufSize)*2)+bufSuffix; // "1024k * 2"->"2048k"
		String level    = spec.level.isEmpty()?"5.0":spec.level;
		int gop         = fps*gopdur/1000;
		int keyMin      = gop / 2;
		
		String pixFormat = spec.profile.equals("main10")?"yuv420p10le"
			: spec.profile.equals("high")  ?"yuv420p10le"
			: spec.profile.equals("main12")?"yuv420p12le"
			: "yuv420p"; // main(8bit), this value controls the profile main8bit,main10bit,main12bit

		// must also use x265-params custom argument to give a common ffmpeg args (ref,bf,g,keyint,etc..)
		List<String> args=Arrays.asList(MediaTools.FFMPEG, 
			"-hide_banner", "-nostats",
			"-i", inputFile,
			"-threads", "4", "-preset", "fast",
			"-c:v", "libx265", "-crf", spec.crf, // ConstantRateFactor
			"-tag:v", "hvc1", // use HVC1 instead of default HEV1
			"-level", level,
			//"-s:v", spec.size, 		// resolution 3840x2160, replaced by swscale
			"-maxrate:v", spec.bitrate, // max rate for crf
			"-bufsize:v", bufSize,      // 2*bitrate			
			//"-b:v", spec.bitrate, 	// video bitrate 2000k
			//"-maxrate:v", spec.bitrate,
			//"-bufsize:v", spec.bitrate,
			"-pix_fmt", pixFormat,
			"-r", forceFps ? ""+fps:"$DEL2$",			
			"-refs", "3",			// reference frames
			"-bf", "3",				// max number of bframes
			"-g", ""+gop,			// GOP frames
			"-keyint_min", ""+keyMin,	// I-Frame interval (keyframes)
			"-b_strategy", "1",		// BPyramid strategy
			"-flags", "+cgop",		// use ClosedGOP
			"-sc_threshold", "0",	// disable Scenecut
			"-movflags", "negative_cts_offsets+faststart",
			"-x265-params", "level_idc=${level}:min-keyint=${keymin}:keyint=${gop}:vbv-maxrate=${bitrate}:vbv-bufsize=${bufsize}:ref=3:bframes=3:b-adapt=1:no-open-gop=1:scenecut=0:b-pyramid=0",
			"-vf", "${overlay,scale}",	// draw overlay text on video (optional),swscale
			"-color_range", "tv",	// limited(tv), full(pc) rgb range, signal range
			"-colorspace", "bt709", // RGB to YUV colormatrix
			"-color_primaries", "bt709", // RGB map to real values
			"-color_trc", "bt709",  // transfer function RGB or YUV to display luminance 			
			"-an", "-sn",           // skip audio+subs
			"-metadata:s:v:0", !spec.lang.isEmpty() ? "language="+spec.lang : "$DEL2$",			
			"-t", "${timelimit}",	// read X seconds then stop encoding
			"-y", outputFile        // overwrite "temp-v1.mp4"
		);
		args = new ArrayList<String>(args); // create modifiable list

		int idx= args.indexOf("-x265-params")+1;
		args.set(idx, args.get(idx)
				//.replace("${profile}", spec.profile.isEmpty()?"main":spec.profile)
				.replace("${level}", level)
				//.replace("${fps}", ""+fps)
				.replace("${keymin}", ""+keyMin)
				.replace("${gop}", ""+gop)
				.replace("${bitrate}", spec.bitrate.replace("k", ""))
				.replace("${bufsize}", bufSize.replace("k", ""))
				);

		// use full internal YUV444+accurate rounding: flags=full_chroma_int+accurate_rnd 
		String scale   = "scale="+spec.size+":out_range=tv:out_color_matrix=bt709:flags=full_chroma_int+accurate_rnd";
		String format  = "format="+pixFormat+",setsar=1/1"; // StorageAspectRatio(1:1)
		String overlay = MediaTools.getOverlayOpt(spec, fps, gop, segdur, overlayOpt);
		String val     = overlay+","+scale+","+format;
		args.set(args.indexOf("${overlay,scale}"), val.charAt(0)==','?val.substring(1):val);
		
		MediaTools.updateOpt(args, "${timelimit}", timeLimit>0 ? String.valueOf(timeLimit) : null, true);		
		MediaTools.removeEmptyOpt(args);
		return args;
	}

	/**
	 * Create MP4Box command.
	 * @param specs		stream specifications
	 * @param segdur	segment duration in milliseconds (3840=3,84s)
	 * @param timeLimit  timelimit seconds or -1
	 * @param initMode	init segment. inband=AVC3_common_init, multi=AVC1_common_init_hbbtv,
	 * 			merge=AVC1_common_init, no=AVC1_separate_init(=best backward comp)
	 * @param sidx		SIDX box. -1=no sidx, 0=one sidx box, 1..n=number of subsegs in SIDX box
	 * @param segname	segment url name. number=use $Number$, time=use $Time$,
	 * 			number-timeline=use $Number$ and SegmentTimeline, time-timeline=use $Time$ and SegmentTimeline
	 * @param cmaf      cmf2,cmfc,no  cmaf profile
	 * @param isSingleSeg   use single segment(onDemand)
	 * @param manifestName   "manifest.mpd", "cenc/manifest.mpd"
	 * @param useDrmInput input drm or nodrm "temp-v1.mp4", "temp-v1-cenc.mp4" 
	 * @param useHls    create HLS manifest
	 * @return
	 */
	public static List<String> getDashArgs(List<StreamSpec> specs, int segdur, 
			//int gopdur, @param gopdur	GOP duration seconds
			long timeLimit, String initMode, int sidx,
			String segname,
			String cmaf,
			boolean isSingleSeg,
			String manifestName,
			boolean useDrmInput, boolean useHLS
			) {
		// Use MDP.minBufferTime=segdur*2 to make validator happy, default 1.5sec-3sec 
		// value most likely gives "buffer underrun" warnings.
		//    https://conformance.dashif.org/
		//    https://www.mankier.com/1/gpac-filters
		// ver(version): 
		//    1=write SIDX table (1 fragment), segtimeline
		//    2=no segtimeline, use audioSampleRate scale, use -bound(split before or at boundary not after)
		//    3=no segtimeline, use audioSampleRate scale, use -closest(split closest before or after)
		//    4=use audioSampleRate scale, don't use bound+closest(case: spring 8s multimoofmdat duration broken) 

		Map<String,String> specAttrs=new HashMap<String,String>(3);
		specAttrs.put("asIdV", "0");  // video: 1..n trackgroup per codec
		specAttrs.put("asIdA", "20"); // audio: 21..n trackgroup per codec+lang
		// Subtitle inserter uses asID=51..n
		
		//int scale=-1;
		for(StreamSpec spec : specs) {
			boolean isAudio = spec.type.isAudio();
			//if (isAudio && scale<0)
			//	scale = spec.sampleRate; // 44100, 48000

			// AdaptationSet@id="1..n" track groups per codec (h264,h265)			
			String key = spec.type.toString();
			String val = specAttrs.get("codec."+key+"."+spec.groupIdx);
			if(val==null) {
				String asId = !isAudio ? "asIdV":"asIdA";
				int ival = Integer.parseInt(specAttrs.get(asId))+1;
				val = ""+ival;
				specAttrs.put(asId, val);
				specAttrs.put("codec."+key+"."+spec.groupIdx, val);
				// spec.role=already set in dasher.java				
			//} else {
			//	spec.role=""; // remove from additional tracks inside the same track group
			}
			spec.asId = val; // 1..n number
		}
		
		//scale = Math.max(1000, scale); // default to 1s if no audio was given
		segname = segname.toLowerCase(Locale.US);
		
		// use ver=4, don't use ver=3 "-closest" as it most likely breaks 8s segdur(case: spring 3. and 4. segments)
		List<String> args=Arrays.asList(MediaTools.MP4BOX,
			//"-dash", ""+(scale>0?segdur*scale/1000 : segdur), // segment duration 6sec*1000 or use audioRate
			//"-frag", ""+(scale>0?segdur*scale/1000 : segdur), // for better seg alignment (important for 44.1KHz)
			//scale>0?"-dash-scale":"", scale>0?""+scale:"",
			"-dash", ""+segdur, // segment duration millisecs
			"-frag", ""+segdur, // for better seg alignment
			"-dash-scale", "1000",  // use 1000 so that mp4box uses the same value in mpd+segments (cmaf requirement)
			//(ver==1 || ver==4?"":ver==2?"-bound":"-closest"), // force seg duration, last segment may be shorter (video=146sec, segdur=6sec -> 24*6sec + 1*2sec segments)
			"-mem-frags", "-rap",
			"-profile", (isSingleSeg ? "dashavc264:onDemand":"dashavc264:live"),  // use single file or 1..N small segment files
			"-profile-ext", "urn:hbbtv:dash:profile:isoff-live:2012", // hbbtv1.5
			//"-min-buffer", ""+(gopdur*1000*2), //  ""+(segdur*1000*2) | "3000" |  MDP.minBufferTime value, does this work?
			"-min-buffer", "2000", //  ""+(segdur*1000*2) | "3000" |  MDP.minBufferTime value, does this work?
			"-mpd-title", "refapp", "-mpd-info-url", "http://refapp",
			"-bs-switching", initMode, // inband=AVC3_common_init, multi=AVC1_common_init_hbbtv, merge=AVC1_common_init, no=AVC1_separate_init (best backward comp)
			"-sample-groups-traf",	// sgpd+sbgp atom in MOOF/TRAF(audio), IE11 fix  
			"-single-traf", 
			"--tfdt64",          // use 64bit tfdt(version=1) timestamp
			"--tfdt_traf",		 // write MOOF/MDAT/TFDT(decodeTime) inside all multifrag pairs
			"--noroll=yes",		 // don't write SGPD,SBGP(sample-to-groupbox roll) atoms
			"--btrt=no",		 // don't write BTRT bitrate in init.mp4 (old Sony players may crash)
			"--truns_first=yes", // MOOF/TRAF/TRUN, /SENC ordering, some devices may crash if SENC is before TRUN
			(cmaf.isEmpty() ? "$DEL$" : "--cmaf="+cmaf), // CMAF constraints (no edit list, truns_first, negative composite offset, ..)
			"-subsegs-per-sidx", ""+sidx,
			//"-last-dynamic",  // insert lmsg brand to the last segment(MDP.type=dynamic)
			//"-segment-name", (useIdFolder ? "$RepresentationID$/$Number$$Init=i$" : "$RepresentationID$_$Number$$Init=i$"),
			"-segment-name", segname.startsWith("number") ? 
					"$RepresentationID$/$Number$$Init=i$" : "$RepresentationID$/$Time$$Init=i$",
			segname.endsWith("-timeline") ? "-segment-timeline" : "$DEL$", //ver==1?"-segment-timeline":"",
			"-out", manifestName + (useHLS?":dual":"")  // output file
		);
		args = new ArrayList<String>(args);
		
		for(StreamSpec spec : specs) {
			File trackFile = useDrmInput ? 
				spec.inputFileTrackDrm : spec.inputFileTrack;
			String filename = Utils.normalizePath(trackFile.getAbsolutePath(), true);
			String arg=filename+"#trackID=1:id=${name}:period=p0:asID=${asID}:role=${role}:${timelimit}";
			
			if(useHLS) {
				arg +=":#HLSPL=manifest_${name}.m3u8"
					+ ( spec.type.isAudio() ? ":#HLSGroup=audio":"");
			}
			
			arg = arg.replace("${asID}", spec.asId);
			
			if(spec.role.isEmpty()) arg = arg.replace(":role=${role}", "");
			else arg = arg.replace("${role}", spec.role);
			
			arg = arg.replace("${name}", spec.name)
				.replace(":${timelimit}", timeLimit>0?":dur="+timeLimit:"");
						
			args.add(arg);  //if(Utils.isWindows()) args.add("\""+arg+"\"");
		}
		
		MediaTools.removeEmptyOpt(args);		
		return args;
	}
		
}
