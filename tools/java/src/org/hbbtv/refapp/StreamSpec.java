package org.hbbtv.refapp;

import java.io.File;
import java.util.Locale;

/**
 * Simple structure for output stream properties.
 */
public class StreamSpec implements Cloneable {
	// fixme: dash=dash only without transcoding
	// fixme: subtitling(inband, outband)
	public static enum TYPE { 
		VIDEO_H264, VIDEO_H265, VIDEO_H266, VIDEO_AV1,
		AUDIO_AAC, AUDIO_AC3, AUDIO_EAC3,
		DASH; 

		public boolean isAudio() { 
			return this.toString().startsWith("AUDIO_"); 
		}
		public boolean isVideo() { 
			return this.toString().startsWith("VIDEO_"); 
		}

		public static TYPE fromString(String val) {
			val = val.toUpperCase(Locale.US);
			return 
				val.equals("AAC")  || val.endsWith("_AAC") ? AUDIO_AAC :
				val.equals("AC3")  || val.endsWith("_AC3") ? AUDIO_AC3 :   // Dolby Digital
				val.equals("EAC3") || val.endsWith("_EAC3")? AUDIO_EAC3 :  // Dolby Digital Plus
				val.equals("EC3")  || val.endsWith("_EC3") ? AUDIO_EAC3 :
				//val.equals("AC4")  || val.endsWith("_AC4") ? AUDIO_AC4 :   // Dolby NextGen
				val.equals("H264") || val.endsWith("_H264")? VIDEO_H264 :
				val.equals("AVC")  || val.endsWith("_AVC") ? VIDEO_H264 :
				val.equals("H265") || val.endsWith("_H265")? VIDEO_H265 :
				val.equals("HEVC") || val.endsWith("_HEVC")? VIDEO_H265 :
				val.equals("H266") || val.endsWith("_H266")? VIDEO_H266 :
				val.equals("VVC")  || val.endsWith("_VVC") ? VIDEO_H266 :
				val.equals("AV1")  || val.endsWith("_AV1") ? VIDEO_AV1 :
				//val.equals("AVS3")  || val.endsWith("_AVS3") ? VIDEO_AVS3 :  // HiSilicon
				val.equals("DASH") ? DASH :
				null;
		}
	};
	
	public TYPE type;		// H264, AAC
	public String name;		// v1, v2, v3, a1 (segment_*.mp4|m4s name prefix)
	public String size;		// 1280x720, 1920x1080, 3840x2160
	public String bitrate;	// 128k, 500k, 1500k, 2500k
	public String crf;      // ConstantRateFactor "23" h264=0..51 best to worst or 0=use bitrate encoding
	public int sampleRate;	// 44100, 48000	 (audio sample rate), use 48000 for aac tracks
	public int channels;	// 2 (audio channel count)
	//public boolean enabled;
	public String profile;	// h264: main,high, h265: main,main10,main12, high->main10
	public String level; 	// h264: 4.0,  h265: 5.0
	
	// https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes, use 639-2T(3-letter from native lang)
	// german: mp4 MDHD.lang="deu", manifest@lang="de"
	public String lang;		// force language or empty to use an existing input value
	
	public String role;		// manifest role=main,alternate, see Dasher.java, MediaTools2.getDashArgs()
	public String asId;		// manifest AdaptationSet@id="1", see MediaTools2.getDashArgs()
	public int groupIdx;    // 1..n track group(adaptationSet), video=codec, audio=codec+lang
	
	public File inputFile;         // videoaudio.mp4, audio2.mp4 input file before transcoding
	public File inputFileTrack;    // temp/temp-v1.mp4 after transcoding, ready for segmenting
	public File inputFileTrackDrm; // temp/temp-v1-cenc.mp4,  ready for segmenting
	
	public int getWidth() {
		int idx=size.indexOf('x');
		return Integer.parseInt(size.substring(0, idx));
	}
	
	public String getCodec() {
		String val = type.toString();
		int idx=val.indexOf('_');
		return idx>0 ? val.substring(idx+1) : val;
	}

	@Override protected Object clone() throws CloneNotSupportedException {
        return super.clone();
    }
}
