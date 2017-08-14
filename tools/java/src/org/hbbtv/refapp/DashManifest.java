package org.hbbtv.refapp;

import java.util.*;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import org.w3c.dom.Document;
import org.w3c.dom.Element;

/**
 * Fix some of the common manifest.mpd formatting problems. 
 */
public class DashManifest {
	private File file;
	private Document doc;
	private boolean modified;
	
	public DashManifest(File file) {
		this.file=file;
	}

	/**
	 * Fix manifest formatting issues.
	 * @param mode	h264,h265
	 * @throws Exception
	 */
	public void fixContent(StreamSpec.TYPE mode) throws Exception {
		modified=false;

		String val;
		Element elem;
		
		FileInputStream fis = new FileInputStream(file);
		try {
			doc = XMLUtil.createDocument(fis);
		} finally {
			try { fis.close(); } catch(Exception ex){}
		}

		// remove an empty <BaseURL></BaseURL> element
		elem = XMLUtil.getChildElement(doc.getDocumentElement(), "BaseURL");
		if (elem!=null) {
			val = XMLUtil.getText(elem, "");
			if (val.isEmpty() || val.equals("./") || val.equals(".")) {
				modified=true;
				elem.getParentNode().removeChild(elem);
			}
		}
		
		if (mode==StreamSpec.TYPE.VIDEO_H265) {
			// drop dash264 profile tag
			// profiles="urn:mpeg:dash:profile:isoff-live:2011,http://dashif.org/guidelines/dash264,urn:hbbtv:dash:profile:isoff-live:2012"
			val = doc.getDocumentElement().getAttribute("profiles");
			int idx=val.indexOf("http://dashif.org/guidelines/dash264");
			if (idx>=0) {
				modified=true;
				val = val.replace( (idx>0?",":"")+"http://dashif.org/guidelines/dash264", "");
				doc.getDocumentElement().setAttribute("profiles", val);
			}
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
			
			if (oldval!=null) {
				modified=true;
				elemAS.setAttribute("startWithSAP", oldval);
				for(Element elemRE : XMLUtil.getChildElements(elemAS, "Representation"))
					elemRE.removeAttribute("startWithSAP");
			}			
		}
	}
	
	public void addNamespaces() {
		String[] values = new String[] {
				"xmlns:cenc", "urn:mpeg:cenc:2013",
				"xmlns:mspr", "urn:microsoft:playready",
				"xmlns:mas",  "urn:marlin:mas:1-0:services:schemas:mpd"
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
		if (drmName.equals("cenc")) tag="urn:mpeg:dash:mp4protection:2011";
		else if (drmName.equals("playready")) tag="urn:uuid:9a04f079-9840-4286-ab92-e65be0885f95";
		else if (drmName.equals("widevine")) tag="urn:uuid:edef8ba9-79d6-4ace-a3c8-27dcd51d21ed";
		else if (drmName.equals("marlin")) tag="urn:uuid:5e629af5-38da-4063-8977-97ffbd9902d4";
		else return;
		//tag = tag.toLowerCase(Locale.US);
		
		Element elem = XMLUtil.getChildElement(doc.getDocumentElement(), "Period");
		for(Element elemAS : XMLUtil.getChildElements(elem, "AdaptationSet")) {
			for(Element elemCP : XMLUtil.getChildElements(elemAS, "ContentProtection")) {
				if (tag.equals(elemCP.getAttribute("schemeIdUri").toLowerCase(Locale.US))) {
					modified=true;
					elemCP.getParentNode().removeChild(elemCP);
				}
			}
		}
	}
	
	/**
	 * Save manifest.mpd if content was modified.
	 * @param outputFile
	 * @throws Exception
	 */
	public void save(File outputFile) throws Exception {
		if (!modified) return;
		String val = XMLUtil.createXML(doc.getDocumentElement());
		FileOutputStream fos = new FileOutputStream(outputFile);
		try {
			fos.write(val.getBytes("UTF-8"));
		} finally {
			fos.close();
		}
	}
	
}
