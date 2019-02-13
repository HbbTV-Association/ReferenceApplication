package org.hbbtv.refapp;

import java.io.*;
import java.util.*;

import org.w3c.dom.Document;
import org.w3c.dom.NodeList;
import org.w3c.dom.Node;
import org.w3c.dom.Element;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.transform.OutputKeys;
import javax.xml.transform.Transformer;
import javax.xml.transform.TransformerFactory;
import javax.xml.transform.dom.DOMSource;
import javax.xml.transform.stream.StreamResult;
import org.xml.sax.InputSource;

public class XMLUtil {

	public static Document createDocument(String data) throws IllegalArgumentException {
		return createDocument(new StringReader(data));
	}
	
	public static Document createDocument(InputStream stream) throws IllegalArgumentException {
		return createDocument(new InputSource(stream));
	}
	
	public static Document createDocument(Reader reader) throws IllegalArgumentException {
		return createDocument(new InputSource(reader));
	}
	
	public static Document createDocument(InputSource is) throws IllegalArgumentException {
		DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
		factory.setCoalescing(true);
		factory.setIgnoringComments(true);
		factory.setIgnoringElementContentWhitespace(true);
		factory.setValidating(false);		
		try {
			DocumentBuilder builder = factory.newDocumentBuilder();
			return builder.parse(is);
		} catch (Exception ex) {
			throw new IllegalArgumentException(ex.getMessage(), ex);
		}
	}
	
/***************************************************/

	/**
	 * Get first child element by nodename.
	 * @param parent
	 * @param name	name of element or NULL to return first element
	 * @return	element or null
	 */
	public static Element getChildElement(Element parent, String name) {
		for (Node child = parent.getFirstChild(); child != null; child = child.getNextSibling()) {
			if (child instanceof Element) {
				if (name!=null) {
					if (name.equals(child.getNodeName()))
						return (Element)child;
				} else {
					return (Element)child;
				}
			}
	    }
	    return null;
	}

	/**
	 * Get all child elements by nodename.
	 * @param parent
	 * @param name
	 * @return	list of elements or empty list
	 */
	public static List<Element> getChildElements(Element parent, String name) {
		List<Element> list = new ArrayList<Element>();
		for (Node child = parent.getFirstChild(); child != null; child = child.getNextSibling()) {
			if (child instanceof Element && name.equals(child.getNodeName()))
				list.add((Element)child);
	    }
	    return list;
	}
	
	/**
	 * Get text from element. Loop all #text child nodes.
	 * @param element
	 * @param defval	default value if element was null 
	 * @return
	 */
	public static String getText(Element element, String defval) {
		String value = getText(element);
		return (value != null ? value : defval);
	}
	
	/**
	 * Get text from element. Loop all #text child nodes.
	 */
	public static String getText(Element element) {
		if (element == null) return null;
		StringBuilder sb = new StringBuilder();
		NodeList nodes = element.getChildNodes();
		Node node;
		for(int i=0; i < nodes.getLength(); i++) {
			node = nodes.item(i);
			if (node.getNodeType() == Node.TEXT_NODE)
				sb.append(node.getNodeValue());
		}
		return sb.toString().trim();
	}

	/**
	 * Create XML string from dom element tree.
	 * @param elem
	 * @return
	 * @throws Exception
	 */
	public static String createXML(Element elem) throws Exception {
	    DOMSource source = new DOMSource(elem);
	    StringWriter writer = new StringWriter();
	    StreamResult result = new StreamResult(writer);
	    TransformerFactory transformerFactory = TransformerFactory.newInstance();
	    Transformer transformer = transformerFactory.newTransformer();
	    transformer.setOutputProperty(OutputKeys.INDENT, "yes");
	    //transformer.setOutputProperty("{http://xml.apache.org/xslt}indent-amount", "2");
	    //transformer.setOutputProperty("http://www.oracle.com/xml/is-standalone", "yes");
	    transformer.setOutputProperty(OutputKeys.DOCTYPE_PUBLIC,"yes");
	    transformer.setOutputProperty("http://www.oracle.com/xml/is-standalone", "yes");
	    transformer.transform(source, result);
	    
	    // Java10-transformer adds unecessary empty lines, remove empty lines
	    BufferedReader reader = new BufferedReader(new StringReader(writer.toString()));
	    StringBuilder buf = new StringBuilder();
	    try {
		    String line;
		    while( (line=reader.readLine())!=null ) {
		    	if (!line.trim().isEmpty()) {
		    		buf.append(line); 
		    		buf.append(Utils.NL);
		    	}
		    }
	    } finally {
	    	reader.close();
	    }
	    return buf.toString();  //writer.toString();
	}
	
}
