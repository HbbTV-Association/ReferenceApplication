package org.hbbtv.refapp;

import java.io.File;
import java.io.FileNotFoundException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.TreeSet;

/**
 * Create image thumbnails to be used in a timeline forward-backward seek.
 * interval=snapshots milliseconds, cols=column count in output image, 
 * width,height=tile size
   java -cp "/refapp/lib/*" org.hbbtv.refapp.DasherImageAtlas 
     input="/videos/file1/video1.mp4" output="/videos/file1/image_atlas_320x180.jpg"
     width=256 height=144 cols=10 interval=2000
     "tool.ffmpeg=c:/apps/ffmpeg/ffmpeg.exe"
 */
public class DasherImageAtlas {
	private static LogWriter logger;
	
	public static void main(String[] cmdargs) throws Exception {
		Map<String,String> params = Utils.parseParams(cmdargs, false);

		String val = Utils.getString(params, "logfile", "", true);
		logger = new LogWriter();
		logger.openFile(val.isEmpty() ? null : new File(val), true); // append to a logfile
		logger.println(Utils.getNowAsString() + " Start imageatlas generator");

		logger.println("Parameters:");
		for(String key : new TreeSet<String>(params.keySet()) )
			logger.println(key+"="+params.get(key));
		logger.println("");
		
		MediaTools.initTools(params.get("tool.ffmpeg"), params.get("tool.mp4box"));		
		MediaTools.initParams(params); // init default values		

		File inputFile = new File(params.get("input")); // "/video/temp-360p.mp4"
        if (!inputFile.exists())
            throw new FileNotFoundException(inputFile.getAbsolutePath() + " not found");
        
        File output   = new File(Utils.getString(params, "output", "", true)); // "/video/image_atlas_320x180.jpg"
        int delim     = output.getName().lastIndexOf('.');
        val           = delim>0 ? output.getName().substring(delim) : ".jpg";
        String ext    = val.equalsIgnoreCase(".png")  ? ".png" : // .jpg, .png, .webp
        				val.equalsIgnoreCase(".webp") ? ".webp" :
        				".jpg"; // ".jpg" or ".jpeg"
        
		Map<String,String> meta = MediaTools.readMetadata(inputFile);			

		long duration = Utils.getLong(meta, "durationsec", 0);
		if(duration<1) throw new IllegalArgumentException(String.format("Invalid duration (%d)", duration));
		
		String sfps = Utils.getString(meta, "videoFPS", "25", true);
		if(sfps.indexOf('.')>0) sfps=Utils.getString(meta, "videoFPSRate", "", true); // "24000/1001"
		double ffps = Utils.getDouble(meta, "videoFPS", 25);
		
		final int width   = (int)Utils.getLong(params, "width", 120);   // image width, one img slot
		final int height  = (int)Utils.getLong(params, "height", 68);   // image height
		final int cols    = (int)Utils.getLong(params, "cols", 10);     // image columns in an atlas canvas
		int interval      = (int)Utils.getLong(params, "interval", 2000); // image interval in millis 2000=2s, 3840=3.84s
		
		int images  = (int)Utils.getLong(params, "images", Integer.MIN_VALUE); // number of small images in a canvas
		if(images>1)
			interval = (int)((double)duration / images * 1000); // calc based on number of small images

		images = (int)Math.ceil( (double)duration*1000 / interval); // next integer 3382/30=112.733 -> 113		
		int rows   = (int)Math.ceil( (double)images / cols); // image rows, if "cols=1" then all images in Y axis        

		logger.println( String.format("durationhms=%s, duration=%d, videoWidth=%d, videoHeight=%d, videoFPS=%s"
				+ ", cols=%d, rows=%d, interval=%d, width=%d, height=%d, images=%d"
				, Utils.getString(meta, "durationhms", "",true)
				, duration
				, Utils.getLong(meta, "videoWidth", 0), Utils.getLong(meta, "videoHeight", 0), sfps
				, cols, rows, interval, width, height, images
				) );
		
		// FPS=25, every 30s=25*30=750 frames, TB=timebase
		// select='not(mod(n,750))',setpts='N/(25*TB)', scale=120:68,tile=8x15:padding=0:margin=0
		String filter = "select='not(mod(n,${interval}))',setpts='N/(${fps}*TB)', scale=${width}:${height},tile=${cols}x${rows}:padding=0:margin=0"
			.replace("${width}", ""+width)
			.replace("${height}", ""+height)
			.replace("${fps}", ""+sfps)
			.replace("${interval}", ""+Math.round(ffps*(interval/1000)) )
			.replace("${cols}", ""+cols)
			.replace("${rows}", ""+rows)
			;

		// "$DEL2$" remove empty+previous tokens
		List<String> args=new ArrayList<String>( Arrays.asList(MediaTools.FFMPEG, 
			"-hide_banner", "-nostats",
			"-t", Utils.getString(params, "timelimit", "$DEL2$", true), // "hh:mm:ss" input timelimit for testing use
			"-i", inputFile.getAbsolutePath(),
			"-frames", "1",
			"-filter_complex", filter
			//"-preset", "fast", "-threads", "4",
		) );
		if(ext.equals(".webp")) {
			//-c:v libwebp 
			args.add("-q:v"); args.add("75"); // quality 0..100 default 75
			args.add("-lossless"); args.add("0");
			args.add("-compression_level"); args.add("6"); //  0..6 default 4 worst..best
		} else {
			args.add("-q:v"); args.add("2"); // quality 2-31 best-worst, use 2-5
		}

		args.add("-an"); args.add("-sn");
		args.add("-y");  args.add(output.getAbsolutePath());
		MediaTools.removeEmptyOpt(args);
		
		logger.println(Utils.getNowAsString()+" "+ Utils.implodeList(args, " "));
		val=MediaTools.executeProcess(args, output.getParentFile());
		params.put("iobuffer", val);
		logger.println("");			
		logger.println(Utils.getNowAsString() + " Completed imageatlas");		
	}

}
