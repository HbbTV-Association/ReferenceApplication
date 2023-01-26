package org.hbbtv.refapp;

import java.util.Map;

public class JSONUtil {
	
	/**
	 * JSON string escape.
	 * @param s
	 * @param quote  add leading and trailing " characters to returned value
	 * @return
	 */
	public static String encode(String s, boolean quote) {
    	StringBuilder sb = new StringBuilder(32);
    	if (quote) sb.append("\"");
		for(int idx=0; idx<s.length();idx++) {
            char ch=s.charAt(idx);
            switch(ch){
            case '"':
            	sb.append("\\\"");
                break;
            case '\\':
            	sb.append("\\\\");
                break;
            case '\b':
                sb.append("\\b");
                break;
            case '\f':
                sb.append("\\f");
                break;
            case '\n':
                sb.append("\\n");
                break;
            case '\r':
                sb.append("\\r");
                break;
            case '\t':
            	sb.append("\\t");
                break;
            case '/':
                sb.append("\\/");
                break;
            default:
            	//Reference: http://www.unicode.org/versions/Unicode5.1.0/
            	if((ch>='\u0000' && ch<='\u001F') || (ch>='\u007F' && ch<='\u009F') 
            				|| (ch>='\u2000' && ch<='\u20FF')) {
            		String ss=Integer.toHexString(ch);
                    sb.append("\\u");
                    for(int k=0;k<4-ss.length();k++) sb.append('0');
                    sb.append(ss.toUpperCase());
            	} else sb.append(ch);
            }
		}
		if (quote) sb.append("\"");
		return sb.toString();
	}

	/**
	 * Return key=value pairs as a json document.
	 * @param params
	 * @return
	 */
	public static String getJson(Map<String,String> params) {
		StringBuilder sbuf = new StringBuilder(128);
		sbuf.append("{ ");
		int count=0;
		for(String key : params.keySet()) {
			count++;
			String val = params.get(key);
			if(count>=2) sbuf.append(", ");
			sbuf.append(String.format("%s: %s", 
				encode(key,true), val!=null?encode(val,true):"null"
			));
		}
		sbuf.append(" }");
		return sbuf.toString();		
	}

}
