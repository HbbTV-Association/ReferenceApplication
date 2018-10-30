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
	 * @param mode	h264,h265
	 * @throws Exception
	 */
	public void fixContent(StreamSpec.TYPE mode) throws Exception {
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
			val = elem.getAttribute("media");
			if (val.contains("$Time$")) {
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
		
		// Add Role=main to first audio adaptationset (TODO: what to put additional audios?, video?)
		elem = XMLUtil.getChildElement(doc.getDocumentElement(), "Period");
		for(Element elemAS : XMLUtil.getChildElements(elem, "AdaptationSet")) {
			elem = XMLUtil.getChildElement(elemAS, "Role");
			if (elem!=null) continue;
			elem = XMLUtil.getChildElement(elemAS, "Representation");
			if (elem==null) continue;
			String mime = elem.getAttribute("mimeType");
			if (mime.isEmpty()) mime = elemAS.getAttribute("mimeType");
			if (mime.startsWith("audio/")) {
				modified=true;
				String xml="<Role schemeIdUri=\"urn:mpeg:dash:role:2011\" value=\"main\"/>";
				Element newElem = XMLUtil.createDocument(xml).getDocumentElement();
				elem = XMLUtil.getChildElement(elemAS, "SegmentTemplate");
				elemAS.insertBefore( doc.importNode(newElem, true), elem);
				break;
			}
		}
		
	}
	
	public void addNamespaces() {
		String[] values = new String[] {
				"xmlns:cenc", "urn:mpeg:cenc:2013",
				"xmlns:mspr", "urn:microsoft:playready",
				"xmlns:mas",  "urn:marlin:mas:1-0:services:schemas:mpd",
				"xmlns:ck",   "http://dashif.org/guidelines/clearKey"
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
		if ("hbbtv15".equalsIgnoreCase(profile))
			profile="urn:mpeg:dash:profile:isoff-live:2011,urn:hbbtv:dash:profile:isoff-live:2012";
		else if  ("hbbtv20".equalsIgnoreCase(profile))
			profile="urn:mpeg:dash:profile:isoff-live:2011,urn:dvb:dash:profile:dvb-dash:2014";
		else if  ("hbbtv15_20".equalsIgnoreCase(profile))
			profile="urn:mpeg:dash:profile:isoff-live:2011,urn:dvb:dash:profile:dvb-dash:2014,urn:hbbtv:dash:profile:isoff-live:2012";
		doc.getDocumentElement().setAttribute("profiles", profile);
	}

	public void addContentProtectionElement(String xml) {
		// add CP element after existing ContentProtection elements
		Element newElem = XMLUtil.createDocument(xml).getDocumentElement();
		modified=true;

		Element elem = XMLUtil.getChildElement(doc.getDocumentElement(), "Period");
		for(Element elemAS : XMLUtil.getChildElements(elem, "AdaptationSet")) {
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
	
	public void removeContentProtectionElement(String drmName) {
		// remove <ContentProtection> element by schemeIdUri value
		String tag;
		if (drmName.equals("cenc")) 			tag="urn:mpeg:dash:mp4protection:2011";
		else if (drmName.equals("playready")) 	tag="urn:uuid:"+DashDRM.GUID_PLAYREADY;
		else if (drmName.equals("widevine")) 	tag="urn:uuid:"+DashDRM.GUID_WIDEVINE;
		else if (drmName.equals("marlin")) 		tag="urn:uuid:"+DashDRM.GUID_MARLIN;
		else if (drmName.equals("clearkey") || drmName.equals("emecenc") ) 	
												tag="urn:uuid:"+DashDRM.GUID_CENC;
		else return;
		
		Element elem = XMLUtil.getChildElement(doc.getDocumentElement(), "Period");
		for(Element elemAS : XMLUtil.getChildElements(elem, "AdaptationSet")) {
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
				, Utils.XMLEncode(scheme, true, false), Utils.XMLEncode(value, true, false) );				
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
			return XMLUtil.createXML(doc.getDocumentElement());
		} catch(Exception ex) {
			if (ex instanceof IllegalArgumentException) throw (IllegalArgumentException)ex;
			else throw new IllegalArgumentException(ex);
		}
	}
	
}
