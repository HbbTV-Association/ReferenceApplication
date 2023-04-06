package org.hbbtv.refapp;

import java.io.*;
import java.net.URL;
import java.util.*;
import org.w3c.dom.Document;
import org.w3c.dom.Element;


/**
 * Create multiperiod.mpd from separate dash manifests.
 * - merge multiple advert.mpd files to a single multiperiod.mpd file
 * - insert MPDEvent (state=start,end)
 * 
 * NOTE: experimental, does not handle all the corner cases yet
 * - source has 2..n multiple periods already?
 * - source has BaseURL in mpd/period/adaptationset level, absolute or relative?
 * - source has DRM adaptation sets?
 * - source has Period@id SupplementalProperty links, we write new id values?
 * - source has xmlns:something attributes?
 * - etc.. still unknown cases
 */
public class DasherMultiPeriod {
	private static LogWriter logger;
	
	public static void setLogger(LogWriter lw) {
		logger = lw;
	}
	
	public static void main(String[] args) throws Exception {
		Map<String,String> params = Utils.parseParams(args);
		//MediaTools.initTools(params.get("tool.ffmpeg"), params.get("tool.mp4box"));
		MediaTools.initParams(params); // init default values		
		
		// output folder for manifest.mpd or output file
		String val = Utils.normalizePath(Utils.getString(params, "output", "", true), true);
		if (val.isEmpty() || val.equals("/")) 
			throw new IllegalArgumentException("Invalid output value '" + val +"'");
		if (val.endsWith(".mpd")) {
			// use as-is: output="/data/adverts/adbreak1.mpd"
		} else {
			val = !val.endsWith("/") ? val+"/manifest.mpd" : val+"manifest.mpd"; // output="/data/adbreak1/"
		}
		File outputFile = new File(val);
		outputFile.getParentFile().mkdirs();
		
		val = Utils.getString(params, "logfile", "", true);
		logger = new LogWriter();
		logger.openFile(val.isEmpty() ? null : new File(val), false);

		logger.println(Utils.getNowAsString() + " Start multiperiod generator");
		logger.println("output=" + Utils.normalizePath(outputFile.getAbsolutePath(), true) );

		// Read all manifests: input=, input.1=, input.2= 
		List<ManifestSource> manifests = new ArrayList<ManifestSource>(4);
		int idxMaxSegDur=-1; // index of manifest: maxSegmentDuration
		for(int idx=0; ; idx++) {
			String key = (idx==0 ? "input" : "input."+idx);
			String url = params.get(key);
			if(url==null || url.isEmpty()) {
				if(idx>4) break; 
				else continue;
			}
			if (url.endsWith("disable") || url.startsWith("disable")) continue;

			logger.println("input=" + url);
			ManifestSource msource = new ManifestSource();
			msource.setUrl(url);
			msource.setLimitDuration( Utils.getLong(params, key+".duration", Long.MAX_VALUE) );
			
			try {
				msource.readManifest();
				manifests.add(msource);
				
				ManifestSource oldmsource = idxMaxSegDur<0 ? null : manifests.get(idxMaxSegDur);  
				if (oldmsource==null || msource.getMaxSegmentDuration() > oldmsource.getMaxSegmentDuration())
					idxMaxSegDur = manifests.size()-1; // 0..n index
			} catch (IOException ex) {
				logger.println(ex.getClass().getName()+" "+ex.getMessage()); // skip on error				
			}
		}
		
		if(manifests.isEmpty())
			throw new IllegalArgumentException("No manifests found");
		
		// start merging manifests, use xml template as a starting point
		long totalDuration   = 0; // millis
		int periodCounter    = 0;
		Document manifest    = XMLUtil.createDocument( getManifestTemplate() );
		Element manifestRoot = manifest.getDocumentElement();
		for(ManifestSource msource : manifests) {			
			periodCounter++; // increment per msource
			List<Element> elems = XMLUtil.getChildElements(msource.getRootElement(), "Period");
			for(int idx=0; idx<elems.size(); idx++) {
				Element elem = elems.get(idx);				
				Element newPeriod = (Element)manifest.adoptNode(elem.cloneNode(true)); // clone element from source DOM
				
				val = elems.size()==1 ? "p"+periodCounter : "p"+periodCounter+"-"+(idx+1);  
				newPeriod.setAttribute("id", val); // Period@id				
				if(periodCounter==1) newPeriod.setAttribute("start", "PT0S");
				else newPeriod.removeAttribute("start");
				
				// FIXME: what is source had a baseUrl field?
				Element baseUrl = manifest.createElement("BaseURL");
				baseUrl.setTextContent(msource.getBaseUrl());				
				newPeriod.insertBefore(baseUrl, newPeriod.getFirstChild());
				
				//FIXME: works only if just one period
				if(elems.size()==1 && msource.getLimitDuration() < msource.getMediaDuration())
					msource.setMediaDuration(msource.getLimitDuration());

				newPeriod.setAttribute("duration", getISO8601Duration(msource.getMediaDuration()) );
				
				// insert MdpEvent on first period per msource, counter=1..n, idx=0..n (per msource), count=1..n
				insertEvent(params, newPeriod, periodCounter, idx, manifests.size());
				keepVideoResolutions(params, newPeriod);
				
				manifestRoot.appendChild(newPeriod);
			}
			
			totalDuration += msource.getMediaDuration();			
		}
		
		ManifestSource oldmsource = manifests.get(idxMaxSegDur);
		manifestRoot.setAttribute("maxSegmentDuration", oldmsource.getRootElement().getAttribute("maxSegmentDuration") );
		manifestRoot.setAttribute("mediaPresentationDuration", getISO8601Duration(totalDuration) ); 
		
		// write to output file UTF-8_withoutBOM
		String data = XMLUtil.createXML(manifest.getDocumentElement(), true);
		data = data.replace("<Period ", "\r\n<Period "); // TODO: how do insert whitespace to DOM?
		data = data.replace("<BaseURL>", "  <BaseURL>");
		Utils.saveFile(outputFile, data.getBytes("UTF-8"));
		
		logger.println("output=" + Utils.normalizePath(outputFile.getAbsolutePath(), true) );		
		logger.println(Utils.getNowAsString() + " Completed multiperiod generator");
	}
	
	private static String getManifestTemplate() {
		StringBuilder sbuf = new StringBuilder();
		sbuf.append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
		sbuf.append("<MPD xmlns=\"urn:mpeg:dash:schema:mpd:2011\" maxSegmentDuration=\"${maxSegDur}\" ");
		sbuf.append("mediaPresentationDuration=\"${dur}\" minBufferTime=\"PT1.500S\" ");
		sbuf.append("profiles=\"urn:dvb:dash:profile:dvb-dash:2014,urn:dvb:dash:profile:dvb-dash:isoff-ext-live:2014\" type=\"static\">\n" );
		sbuf.append("</MPD>");
		return sbuf.toString();
	}
	
	private static String getISO8601Duration(long millis) {
		// return "PT18.530S", "PT18S", for now always as seconds
		String val=String.format(Locale.US, "PT%.3fS", (float)millis/1000);
		return val.replace(".000S", "S");
	}
	
	private static int insertEvent(Map<String,String> params, Element newPeriod, 
			int periodCounter, int periodIdx, int periodCount) {
		/* <EventStream schemeIdUri="http://hbbtv.org/refapp" value="advert" timescale="1000">
	      <Event presentationTime="1" duration="1000" id="1">p=${PeriodId}, i=${Index}, c=${Count}, d=${duration}, s=${State}</Event>
	    </EventStream> */
		String scheme= Utils.getString(params, "eventScheme", "", true);
		if(scheme.isEmpty() || scheme.startsWith("disable")) return 0;

		String value = Utils.getString(params, "eventValue", "event", true);  // "advert" or any constant string
		long duration= Utils.parseISODuration( newPeriod.getAttribute("duration") ); // millis		
		String data  = Utils.getString(params, "eventData", "p=${PeriodId}, i=${Index}, c=${Count}, d=${duration}, s=${State}", true);

		// p=Period@id, i=PeriodCounterIdx(1..n), c=countOfPeriods(1..n), d=Period@duration(millis), s=State(start,end)
		String dataVal = data.replace("${Index}", ""+periodCounter) // 1..n msource counter(period counter)
			.replace("${Count}", ""+periodCount)
			.replace("${duration}", ""+duration)			
			.replace("${PeriodId}", newPeriod.getAttribute("id"))
			.replace("${State}", "start");
		
		// insert Event field before first AdaptationSet
		Element as = XMLUtil.getChildElement(newPeriod, "AdaptationSet");
		if(as==null) return 0;
		
		Element eventStream = newPeriod.getOwnerDocument().createElement("EventStream");
		eventStream.setAttribute("schemeIdUri", scheme); // apps must listen for this schemeIdUri
		eventStream.setAttribute("value", value);
		eventStream.setAttribute("timescale", "1000"); // 1000ms
		Element event       = newPeriod.getOwnerDocument().createElement("Event");
		eventStream.appendChild(event);
		event.setAttribute("presentationTime", "1"); // relative to period duration
		event.setAttribute("duration", "1000"); // in timescale (dur=1000, timescale=1000 -> 1sec)
		event.setAttribute("id", String.format("%d%03d", periodCounter, periodIdx+1) );
		event.setTextContent(dataVal);
		
		newPeriod.insertBefore(eventStream, as);
		return 1; // inserted one event
	}
	
	private static int keepVideoResolutions(Map<String,String> params, Element newPeriod) {
		int minHeight = Integer.parseInt(Utils.getString(params, "video.minheight", "0", true) ); // 720
		int maxHeight = Integer.parseInt(Utils.getString(params, "video.maxheight", "99999", true) ); // 1080
		boolean singleRep = minHeight == maxHeight; // if values equal then keep just first "720" resolution match

		//FIXME: multiple codecs for video tracks, how to handle, drop h265/av1/vvc and keep h264? 
		int keepCount=0;
		List<Element> asList = XMLUtil.getChildElements(newPeriod, "AdaptationSet");
		for(int idx=0; idx<asList.size(); idx++) {
			Element as = asList.get(idx);
			String type= as.getAttribute("contentType");
			if(type.isEmpty()) type = as.getAttribute("mimeType");
			if(!type.startsWith("video")) continue; // skip audio,text

			// flag true=keep,false=drop. If all is dropped then choose any match.
			int idxAnyMatch = 0;
			List<Element> repList = XMLUtil.getChildElements(as, "Representation");
			boolean repListFlag[] = new boolean[ repList.size() ];
			for(int idxB=repList.size()-1; idxB>=0; idxB--) {
				if(singleRep && keepCount==1) break; // keep first match only
				Element rep = repList.get(idxB);
				int height  = Integer.parseInt(rep.getAttribute("height"));
				boolean keep= height>=minHeight && height<=maxHeight;
				repListFlag[idxB] = keep;
				if(keep) {
					keepCount++;
				} else if(height>=540 && height<=1080) {
					idxAnyMatch=idxB;
				}
			}

			// keep flagged(true), drop remaining items
			if(keepCount==0) repListFlag[idxAnyMatch]=true;
			for(int idxB=repList.size()-1; idxB>=0; idxB--) {
				if(!repListFlag[idxB])
					as.removeChild(repList.get(idxB));
			}
		}
		
		return keepCount;
	}

	public static class ManifestSource {		
		private Document doc;
		private String url;			// "https://server.com/videos/155126/manifest.mpd"
		private String baseUrl;		// "https://server.com/videos/155126/"
		private long limitDuration; // millis or Long.MAX_VALUE unlimited
		private long maxSegmentDuration; // millisecs, maxSegmentDuration="PT0H0M3.840S"
		private long mediaDuration; // millisecs, mediaPresentationDuration="PT0H0M20.036S" 
		
		//public Document getDocument() { return doc; }
		public Element getRootElement() { return doc.getDocumentElement(); }

		public void setUrl(String url) { this.url=url; }
		public String getUrl() { return url; }
		
		public void setLimitDuration(long dur) { limitDuration = dur; }
		public long getLimitDuration() { return limitDuration; }
		
		public long getMaxSegmentDuration() { return maxSegmentDuration; }
		
		public long getMediaDuration() { return mediaDuration; }
		public void setMediaDuration(long millis) { mediaDuration=millis; }
		
		public String getBaseUrl() { return baseUrl; }
		
		public void readManifest() throws IOException {
			// supports http://,https:// at the moment, TODO file://
			if(!( url.toLowerCase(Locale.US).startsWith("http:") ||
					url.toLowerCase(Locale.US).startsWith("https:") ))
				throw new IllegalArgumentException("Invalid manifest source ("+url+")");
			
			doc = XMLUtil.createDocument(new URL(url).openStream());
			
			String val=doc.getDocumentElement().getAttribute("maxSegmentDuration");
			maxSegmentDuration = Utils.parseISODuration(val);
			val=doc.getDocumentElement().getAttribute("mediaPresentationDuration");
			mediaDuration = Utils.parseISODuration(val);
			
			// read baseUrl from source url, TODO FIXME: use baseUrl from manifest if found
			int idx = url.lastIndexOf('/');
			baseUrl = url.substring(0, idx+1);
		}
	}
			
}
