package org.hbbtv.refapp;

import java.util.*;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import org.w3c.dom.Document;
import org.w3c.dom.Element;

/**
 * Fix some of the common manifest.mpd formatting problems.
 * Modify manifest elements, save new manifest.mpd file.
 */
public class DashManifest {
	//private File file;
	private Document doc;
	private boolean modified;
	
	public DashManifest(File file) throws IOException {
		//this.file=file;
		FileInputStream fis = new FileInputStream(file);
		try {
			doc = XMLUtil.createDocument(fis);
		} finally {
			try { fis.close(); } catch(Exception ex){}
		}		
	}

	public DashManifest(String xmlData) throws IOException {
		doc = XMLUtil.createDocument(xmlData);
	}

	/**
	 * Fix manifest formatting issues.
	 * @param gopdur    GOP(sec) is needed for MDP.minBufferTime
	 * @throws Exception
	 */
	public void fixContent() throws Exception {
		modified=false;
		String val;

		// remove an empty <BaseURL></BaseURL> element
		Element elem = XMLUtil.getChildElement(doc.getDocumentElement(), "BaseURL");
		if (elem!=null) {
			val = XMLUtil.getText(elem, "");
			if (val.isEmpty() || val.equals("./") || val.equals(".")) {
				modified=true;
				elem.getParentNode().removeChild(elem);
			}
		}
		
		// drop dash264 profile tag
		// profiles="urn:mpeg:dash:profile:isoff-live:2011,http://dashif.org/guidelines/dash264,urn:hbbtv:dash:profile:isoff-live:2012"
		val = doc.getDocumentElement().getAttribute("profiles");
		int idx=val.indexOf("http://dashif.org/guidelines/dash264");
		if (idx>=0) {
			modified=true;
			val = val.replace( (idx>0?",":"")+"http://dashif.org/guidelines/dash264", "");
			doc.getDocumentElement().setAttribute("profiles", val);
		}

		// remove <ProgramInformation> element
		elem = XMLUtil.getChildElement(doc.getDocumentElement(), "ProgramInformation");
		if (elem!=null) {
			modified=true;
			elem.getParentNode().removeChild(elem);				
		}
		
		// Fix codec value, must be .2 according to specs (not needed anymore)
		// codecs="mp4a.40.02" -> codecs="mp4a.40.2"

		// Fix mp4box $Time$ bug in SegmentTemplate.media value
		// $RepresentationID$_$Number$$Time$.m4s -> $RepresentationID$_$Number$.m4s
		elem = XMLUtil.getChildElement(doc.getDocumentElement(), "Period");
		for(Element elemAS : XMLUtil.getChildElements(elem, "AdaptationSet")) {
			elem = XMLUtil.getChildElement(elemAS, "SegmentTemplate");
			if(elem==null) continue;
			val = elem.getAttribute("media");
			if (val.contains("$Number$") && val.contains("$Time$")) {
				modified=true;
				elem.setAttribute("media", val.replace("$Time$","") );
			}
		}

		// Move AdaptationSet.Representation.startWithSAP="1" to AdaptationSet.startWithSAP="1"
		// if all values are equal to each other.
		elem = XMLUtil.getChildElement(doc.getDocumentElement(), "Period");
		for(Element elemAS : XMLUtil.getChildElements(elem, "AdaptationSet")) {
			String oldval=null;
			for(Element elemRE : XMLUtil.getChildElements(elemAS, "Representation")) {
				val = elemRE.getAttribute("startWithSAP");
				if (oldval==null) oldval=val;
				if (!val.equals(oldval)) {
					oldval=null; // field values don't equal, do not fix mpd
					break;
				} else oldval=val;
			}
			
			if (oldval!=null && !oldval.isEmpty()) {
				modified=true;
				elemAS.setAttribute("startWithSAP", oldval);
				for(Element elemRE : XMLUtil.getChildElements(elemAS, "Representation"))
					elemRE.removeAttribute("startWithSAP");
			}			
		}
		
		// consider all videos are always progressive,
		// update AdaptationSet.contentType attribute
		elem = XMLUtil.getChildElement(doc.getDocumentElement(), "Period");
		for(Element elemAS : XMLUtil.getChildElements(elem, "AdaptationSet")) {
			String mime=null; 
			for(Element elemRE : XMLUtil.getChildElements(elemAS, "Representation")) {
				mime = elemRE.getAttribute("mimeType");
				if (mime.isEmpty()) mime = elemAS.getAttribute("mimeType");
				if (mime.startsWith("video/")) {
					if (elemRE.getAttribute("scanType").isEmpty()) {
						modified=true;
						elemRE.setAttribute("scanType", "progressive");
					}
				}
			}
			
			if (mime!=null && elemAS.getAttribute("contentType").isEmpty()) {
				mime = mime.startsWith("video/") ? "video" :
					   mime.startsWith("audio/") ? "audio" :
					   "";
				if (!mime.isEmpty())
					elemAS.setAttribute("contentType", mime);
			}
		}
		
		//TODO: insert h264,h265 AdaptationSet prop
		// <SupplementalProperty schemeIdUri="urn:mpeg:dash:adaptation-set-switching:2016" value="1"/>
		
		// remove tuple Role=main,alternate (mp4box bug?)
		for(Element elemAS : XMLUtil.getChildElements(elem, "AdaptationSet")) {
			Set<String> roles = new HashSet<String>(4);
			List<Element> elems = XMLUtil.getChildElements(elemAS, "Role");
			for(idx=elems.size()-1; idx>=0; idx--) {
				elem = elems.get(idx);
				val=elem.getAttribute("schemeIdUri")+elem.getAttribute("value");
				if(roles.contains(val)) {
					elems.remove(idx);
					elem.getParentNode().removeChild(elem);
				} else {
					roles.add(val);
				}
			}
		}
		
		// Add Role=main,alternate inside AdaptationSet elements
		/* elem = XMLUtil.getChildElement(doc.getDocumentElement(), "Period");		
		int countA=0, countV=0;
		for(Element elemAS : XMLUtil.getChildElements(elem, "AdaptationSet")) {
			elem = XMLUtil.getChildElement(elemAS, "Role");
			if (elem!=null) continue;
			elem = XMLUtil.getChildElement(elemAS, "Representation");
			if (elem==null) continue;
			String mime = elem.getAttribute("mimeType");
			if (mime.isEmpty()) mime = elemAS.getAttribute("mimeType");
			if (mime.startsWith("audio/")) {
				modified=true;
				String xml= String.format("<Role schemeIdUri=\"urn:mpeg:dash:role:2011\" value=\"%s\"/>"
					, (countA==0?"main":"alternate"));
				Element newElem = XMLUtil.createDocument(xml).getDocumentElement();
				elem = XMLUtil.getChildElement(elemAS, "SegmentTemplate");
				elemAS.insertBefore( doc.importNode(newElem, true), elem);
				countA++;
			} else if (mime.startsWith("video/")) {
				modified=true;
				String xml= String.format("<Role schemeIdUri=\"urn:mpeg:dash:role:2011\" value=\"%s\"/>"
					, (countV==0?"main":"alternate"));
				Element newElem = XMLUtil.createDocument(xml).getDocumentElement();
				elem = XMLUtil.getChildElement(elemAS, "SegmentTemplate");
				elemAS.insertBefore( doc.importNode(newElem, true), elem);
				countV++;
			}
		} */
		
		// see also MediaTools.getDashArgs(), -min-buffer=(gopdur*1000*2) millis, MDP@minBufferTime="PT4S" secs		
		/*if(gopdur>0) {
			int time = gopdur/1000; //gopdur*2;
			val = doc.getDocumentElement().getAttribute("minBufferTime");
			if(!val.contains("PT"+time+"S"))
				doc.getDocumentElement().setAttribute("minBufferTime", "PT"+time+"S");
		}*/
	}
	
	public void addNamespaces() {
		String[] values = new String[] {
				"xmlns:cenc",  "urn:mpeg:cenc:2013",
				"xmlns:mspr",  "urn:microsoft:playready",
				"xmlns:mas",   "urn:marlin:mas:1-0:services:schemas:mpd",
				"xmlns:ck",    "http://dashif.org/guidelines/clearKey", // legacy clearkey
				"xmlns:dashif","https://dashif.org/", // new clearkey
				"xmlns:xlink", "http://www.w3.org/1999/xlink" // Period XLINK injection
		};
		
		Element elem = doc.getDocumentElement();
		for(int idx=0; idx<values.length; idx+=2) {
			String val = elem.getAttribute(values[idx]);
			if (val.isEmpty()) {
				modified=true;
				elem.setAttribute(values[idx], values[idx+1]);
			}
		}
	}
	
	public void setProfile(String profile) {
		// https://dashif.org/identifiers/profiles/
		if ("hbbtv15".equalsIgnoreCase(profile)) // HBBTV profile (old)
			profile="urn:mpeg:dash:profile:isoff-live:2011,urn:hbbtv:dash:profile:isoff-live:2012";
		else if  ("hbbtv20".equalsIgnoreCase(profile)) // MPEG profile(a168_dvb-dash.pdf)
			profile="urn:mpeg:dash:profile:isoff-live:2011,urn:dvb:dash:profile:dvb-dash:2014";
		else if  ("hbbtv15_20".equalsIgnoreCase(profile)) // MPEG+HBBTV
			profile="urn:mpeg:dash:profile:isoff-live:2011,urn:dvb:dash:profile:dvb-dash:2014,urn:hbbtv:dash:profile:isoff-live:2012";
		else if ("dvb2014".equalsIgnoreCase(profile)) // DVB (new)
			profile="urn:dvb:dash:profile:dvb-dash:2014,urn:dvb:dash:profile:dvb-dash:isoff-ext-live:2014";
		else if (profile.isEmpty() || profile.equals("keep")) return; // keep the original value
		doc.getDocumentElement().setAttribute("profiles", profile);
	}

	/**
	 * @param asType AdaptationSet "video","audio" or empty string to put inside all AS elements
	 * @param xml
	 */
	public void addContentProtectionElement(String asType, String xml) {
		// add CP element after existing ContentProtection elements
		if(xml.isEmpty()) return;
		Element newElem = XMLUtil.createDocument(xml).getDocumentElement();

		Element elem = XMLUtil.getChildElement(doc.getDocumentElement(), "Period");
		for(Element elemAS : XMLUtil.getChildElements(elem, "AdaptationSet")) {
			if(!asType.isEmpty() && !elemAS.getAttribute("contentType").equals(asType))
				continue;
			modified=true;			
			List<Element> elems = XMLUtil.getChildElements(elemAS, "ContentProtection");
			if (elems.isEmpty()) {
				elem = XMLUtil.getChildElement(elemAS, "SegmentTemplate");
				elemAS.insertBefore( doc.importNode(newElem, true), elem);
			} else {
				elem = elems.get(elems.size()-1);
				elem.getParentNode().insertBefore( doc.importNode(newElem, true), elem.getNextSibling());
			}
		}
	}
	
	public void removeContentProtectionElement(String asType, String drmName) {
		// remove <ContentProtection> element by schemeIdUri value
		String tag;
		if (drmName.equals(DashDRM.CENC.NAME)) 			 tag="urn:mpeg:dash:mp4protection:2011";
		else if (drmName.equals(DashDRM.PLAYREADY.NAME)) tag="urn:uuid:"+DashDRM.PLAYREADY.GUID;
		else if (drmName.equals(DashDRM.WIDEVINE.NAME))  tag="urn:uuid:"+DashDRM.WIDEVINE.GUID;
		else if (drmName.equals(DashDRM.MARLIN.NAME))    tag="urn:uuid:"+DashDRM.MARLIN.GUID;
		else if (drmName.equals(DashDRM.CLEARKEY.NAME))  tag="urn:uuid:"+DashDRM.CLEARKEY.GUID;
		else if (drmName.equals("clearkeycenc"))         tag="urn:uuid:"+DashDRM.CENC.GUID; // legacy clearkey element
		else return;
		
		Element elem = XMLUtil.getChildElement(doc.getDocumentElement(), "Period");
		for(Element elemAS : XMLUtil.getChildElements(elem, "AdaptationSet")) {
			if(!asType.isEmpty() && !elemAS.getAttribute("contentType").equals(asType))
				continue;
			for(Element elemCP : XMLUtil.getChildElements(elemAS, "ContentProtection")) {
				if (tag.equalsIgnoreCase(elemCP.getAttribute("schemeIdUri"))) {
					modified=true;
					elemCP.getParentNode().removeChild(elemCP);
				}
			}
		}
	}

	/**
	 * Add <InbandEventStream..> element
	 * @param scheme
	 * @param value
	 * @param mimeAS	add before "video" or "audio" representations
	 */
	public void addInbandEventStreamElement(String scheme, String value, String mimeAS) {
		// add IES element before <Representation..> element within video or audio AdaptationSet
		String xml = String.format("<InbandEventStream schemeIdUri=\"%s\" value=\"%s\"/>"
				, XMLUtil.encode(scheme, true, false), XMLUtil.encode(value, true, false) );				
		Element newElem = XMLUtil.createDocument(xml).getDocumentElement();

		Element elem = XMLUtil.getChildElement(doc.getDocumentElement(), "Period");
		for(Element elemAS : XMLUtil.getChildElements(elem, "AdaptationSet")) {
			List<Element> elems = XMLUtil.getChildElements(elemAS, "Representation");
			if (elems.isEmpty() || !elems.get(0).getAttribute("mimeType").startsWith(mimeAS))
				continue; // not given mimeType="video/mp4", "audio/mp4"

			modified=true;
			elem = XMLUtil.getChildElement(elemAS, "SegmentTemplate");
			//elem = elems.get(0); // first REP
			//elem = XMLUtil.getChildElement(elemAS, null); // first child of AS
			elemAS.insertBefore( doc.importNode(newElem, true), elem);
			break;
		}
	}
	
	public void removeInbandEventStreamElement(String scheme, String value) {
		// remove all <IES..> elements
		Element elem = XMLUtil.getChildElement(doc.getDocumentElement(), "Period");
		for(Element elemAS : XMLUtil.getChildElements(elem, "AdaptationSet")) {
			List<Element> elems = XMLUtil.getChildElements(elemAS, "InbandEventStream");
			if (!elems.isEmpty()) modified=true;
			for(Element elemIES : elems)
				elemIES.getParentNode().removeChild(elemIES);
		}
	}
	
	/**
	 * Remove representations
	 * @param id      Representation@id value, one or more comma(,) or "*" to drop AdaptationSet
	 * @param mimeAS  "video", "audio" or use empty to read any AdaptationSet
	 * @param langAS  "eng,fin" or "*" languages to match
	 * @param maxHeight maxHeight of video representation to keep or -1 to skip this filter
	 * @return
	 */
	public int removeRepresentation(String id, String mimeAS, String langAS
			, int maxHeight) {
		int count=0;
		if(mimeAS.isEmpty()) mimeAS="*";
		if(langAS.isEmpty()) langAS="*";
		for(Element elemP : XMLUtil.getChildElements(doc.getDocumentElement(), "Period")) {
			for(Element elemAS : XMLUtil.getChildElements(elemP, "AdaptationSet")) {
				if(!langAS.equals("*")) {
					String[] tokens = langAS.split("\\s*,\\s*"); // split "fin,swe", skip tuple whitespaces					
					if(Utils.indexOfArray(tokens, elemAS.getAttribute("lang"))<0)
						continue;
				}

				List<Element> elems = XMLUtil.getChildElements(elemAS, "Representation");

				String[] tokens = mimeAS.split("\\s*,\\s*"); // split "video,audio,text"					
				String mime=elemAS.getAttribute("contentType");
				if(mime.isEmpty()) {
					mime = !elems.isEmpty() ? elems.get(0).getAttribute("mimeType") : "unknown/xx"; // "video/mp4", "audio/mp4"
					mime = mime.substring(0, mime.indexOf('/'));
				}
				if(!mimeAS.equals("*")) {
					if(Utils.indexOfArray(tokens, mime)<0)
						continue;
				}
				boolean isVideo = mime.startsWith("video");
				
				// drop 1..n Representation
				tokens = id.split("\\s*,\\s*"); // split "v1,v2", skip tuple whitespaces
				boolean wasModified=false;
				for(int idx=elems.size()-1; idx>=0; idx--) {
					Element elem = elems.get(idx);
					if(tokens[0].equals("*") || Utils.indexOfArray(tokens, elem.getAttribute("id"))>=0) {
						int h = isVideo ? Integer.parseInt(elems.get(idx).getAttribute("height")) : -1;						
						if(!isVideo || (maxHeight<0 || h>maxHeight) ) { 						
							wasModified=true;
							elem.getParentNode().removeChild(elem);
							elems.remove(idx);
							count++;
						}
					}
				}
				if(wasModified) {
					modified=true;
					if(elems.isEmpty()) {
						// no representations left, drop AdaptationSet
						elemAS.getParentNode().removeChild(elemAS);
					} else if(isVideo) {
						int maxw=-1, maxh=-1;
						for(int idx=elems.size()-1; idx>=0; idx--) {
							int w = Integer.parseInt(elems.get(idx).getAttribute("width"));
							int h = Integer.parseInt(elems.get(idx).getAttribute("height"));
							if(w>maxw) maxw=w;
							if(h>maxh) maxh=h;
						}
						if(maxw>-1) elemAS.setAttribute("maxWidth", ""+maxw);
						if(maxh>-1) elemAS.setAttribute("maxHeight", ""+maxh);
					}
				}
			} // loop-elemAS
		}
		return count;
	}
	
	
	/**
	 * Save manifest.mpd if content was modified.
	 * @param outputFile
	 * @param forceSave
	 * @throws Exception
	 */
	public void save(File outputFile, boolean forceSave) throws Exception {
		if (!modified && !forceSave) return;
		String val = this.toString();
		FileOutputStream fos = new FileOutputStream(outputFile);
		try {
			fos.write(val.getBytes("UTF-8"));
		} finally {
			fos.close();
		}
	}
	
	/**
	 * Returns manifest string.
	 */
	public String toString() {
		try {
			return XMLUtil.createXML(doc.getDocumentElement(), true);
		} catch(Exception ex) {
			if (ex instanceof IllegalArgumentException) throw (IllegalArgumentException)ex;
			else throw new IllegalArgumentException(ex);
		}
	}
	
}
