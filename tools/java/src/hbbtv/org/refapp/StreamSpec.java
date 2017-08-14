package hbbtv.org.refapp;

/**
 * Simple structure for output stream properties.
 */
public class StreamSpec {
	public static enum TYPE { VIDEO_H264, VIDEO_H265, AUDIO_AAC };
	
	public TYPE type;
	public String name;
	public String size;
	public String bitrate;
	public int sampleRate;
	public int channels;
}
