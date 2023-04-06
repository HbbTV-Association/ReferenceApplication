package org.hbbtv.refapp;

import java.io.*;
import java.nio.channels.FileChannel;
import java.security.CodeSource;
import java.text.SimpleDateFormat;
import java.util.*;

import javax.xml.bind.DatatypeConverter;

public class Utils {
	public static final String NL = System.getProperty("line.separator", "\r\n");

	public static final String getString(Map<String,String> params, String key, String defval, boolean trim) {
		String val = params.get(key);
		if (trim && val!=null) val=val.trim();
		return (val==null || val.isEmpty() ? defval : val);
	}
	
	public static final boolean getBoolean(Map<String,String> params, String key, boolean defval) {
		String val = params.get(key);
		if (val==null || val.isEmpty()) return defval;
		else return val.equals("1") || val.equalsIgnoreCase("true") 
				|| val.equalsIgnoreCase("yes");
	}

	public static final long getLong(Map<String,String> params, String key, long defval) {
		String val = params.get(key);
		if (val==null || val.isEmpty()) return defval;
		else return Long.parseLong(val);
	}
	
	/**
	 * Parse commandline and config=myapp.properties name-value pairs,
	 * commandline arguments override config file values. 
	 * @param args JVM argument array
	 * @return	Application parameters
	 * @throws IOException
	 */
	public static final Map<String,String> parseParams(String[] args) throws IOException {
		// read commandline arguments
		Map<String,String> params = new HashMap<>();
		for(int idx=0; idx<args.length; idx++) {
			int pos = args[idx].indexOf('=');			
			if (pos>0)
				params.put( args[idx].substring(0, pos).trim(), args[idx].substring(pos+1).trim() );
			else if (pos==0)
				params.put("", args[idx].substring(pos+1).trim() );
			else
				params.put(args[idx].trim(), "");
		}
		
		// read config file or use a default dasher.properties in a dasher app folder
		if (!params.containsKey("config")) {
			// "C:\apps\refapp\tools\java\lib" -> "C:/apps/refapp/tools/java/dasher.properties"
			String libFolder = Utils.getLibraryFolder(MediaTools.class);
			libFolder = Utils.normalizePath(libFolder, true);
			params.put("config", new File(libFolder).getParent()+"/dasher.properties" );
		}
		
		String config = getString(params, "config", "", true);
		if (!config.isEmpty()) {
			FileInputStream fis = new FileInputStream(config);
			try {
				InputStreamReader isr=new InputStreamReader(fis, "UTF-8");
				Properties props=new Properties();
				props.load(isr);
				for(Object oKey : props.keySet()) {
					String key = (String)oKey;
					if ((int)key.charAt(0)>64000) continue; // skip bom row(first line in UTF8WithBOM file), 0xFEFF(65279)					
					if (!params.containsKey(key))
						params.put(key, props.getProperty(key).trim() );
				}
			} finally {
				fis.close();
			}				
		}
		
		return params;
	}
	
	/**
	 * Split args "key1=val1 key2=val2" to params
	 * @param params	write key=value to params
	 * @param keyPrefix keyprefix "input.1." -> "input.1.key1=val1 input.1.key2=val2"
	 * @param args
	 */
	public static void putArgsToParams(Map<String,String> params, String keyPrefix, String[] args) {
		for(int idx=0; idx<args.length; idx++) {
			int delim=args[idx].indexOf('=');
			if(delim>0) params.put( keyPrefix+args[idx].substring(0,delim), args[idx].substring(delim+1) );
		}			
	}

    public static String getStackTrace(Throwable ex) {
		StringWriter sw = new StringWriter();
		PrintWriter pw = new PrintWriter(sw);
		ex.printStackTrace(pw);
		return sw.toString();
    }
    
	/**
	 * Get system timestamp as string
	 * @return	yyyy-MM-dd hh:mm:ss
	 */
   public static String getNowAsString() {
	   SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
	   return sdf.format(Calendar.getInstance().getTime());	   
   }
	
	/**
	 * Convert serial seconds to hh:mm:ss duration time. 
	 * @param secSerial  seconds 0..n
	 * @return
	 */
	public static String serialToTime(int secSerial) {
		int h = (int)Math.floor(secSerial/3600);
		int m = (int)Math.floor(secSerial/60) % 60;
		int s = secSerial % 60; 
		StringBuilder sb = new StringBuilder();
		sb.append( (h < 10 ? "0" + h : "" + h) );
		sb.append(":");
		sb.append( (m < 10 ? "0" + m : "" + m) );
		sb.append(":");
		sb.append( (s < 10 ? "0" + s : "" + s) );
		return sb.toString();
	}
	
	   /**
	    * Parse ISO8601 duration string
	    * @param value P2Y11M4W2DT8H29M59.124S
	    * returns milliseconds 0..n
	    */
	public static long parseISODuration(String value) {
       // http://en.wikipedia.org/wiki/ISO_8601 as (P)eriod(T)ime format 
       // PT29M, PT4M30S, PT2H25M, PT52S, P1Y, PT3H, P2Y11M4W2DT8H29M59S, PT1M32.800S
       if (value==null || value.equals("")) return 0;
       
       long seconds=0, millis=0;
       int startIdx=-1, endIdx=-1;
       boolean isTime=false;
       for(int idx=0; idx < value.length(); idx++) {
           char ch = value.charAt(idx);
           if (ch=='P') { isTime=false; }
           else if (ch=='T') { isTime=true; }
           else if (Character.isDigit(ch)) {
               if (startIdx<0) startIdx=idx;
           } else {
               endIdx=idx;
               long num = Long.parseLong(value.substring(startIdx, endIdx));
               if (ch=='Y') seconds+=num*31556926; // value*seconds
               else if (ch=='M' && !isTime) seconds+=num*2629743;
               else if (ch=='W') seconds+=num*604800;
               else if (ch=='D') seconds+=num*86400;
               else if (ch=='H') seconds+=num*3600;
               else if (ch=='M' && isTime) seconds+=num*60;
               else if (ch=='S') seconds+=num; // seconds only "32S"
               else if (ch=='.') {
            	   seconds+=num; // seconds and millis "32.008S"
            	   millis = Long.parseLong(value.substring(idx+1, value.length()-1));
            	   break;
               }
               startIdx=endIdx=-1;
           }
       }
       return seconds*1000+millis;
	}	

	/**
	 * Convert hexstring to byte array
	 * @param s hex string "656667" is decoded to ABC bytes
	 * @return byte array or NULL if string is null
	 */
	public static byte[] hexToBytes(String s) {
		if (s==null || s.isEmpty())
			return null;
		if (s.startsWith("0x")) s=s.substring(2);
		byte[] bytes = new byte[s.length()/2];
		int count = 0;
		for(int i=0; i < s.length(); i+=2) {
			byte b = (byte)Integer.parseInt(s.substring(i, i+2), 16);
			bytes[count++] = b;
		}
		return bytes;
	}
	
	/**
	 * Convert bytes to hexstring.
	 * @param bytes
	 * @return
	 */
	public static String bytesToHex(byte[] bytes) {
		StringBuilder buffer = new StringBuilder(bytes.length * 2);
		for (int i = 0; i < bytes.length; i++) {
			String s = Integer.toHexString(bytes[i] & 0xff).toUpperCase(Locale.US);
			if (s.length() < 2) buffer.append("0");
			buffer.append(s);
		}
		return buffer.toString();
	}	
	
    public static String base64Encode(byte[] buf) {
		return DatatypeConverter.printBase64Binary(buf);
	}	

	public static byte[] base64Decode(String buf) {
		return DatatypeConverter.parseBase64Binary(buf);
	}

	/**
	 * Flip(reverse) bytes in an array.
	 * @param buf
	 * @param startIdx
	 * @param len  number of bytes to flip
	 */
	public static void flipBytes(byte buf[], int startIdx, int len) {
		int endIdx=startIdx+len-1;
		int endIdxHalf=startIdx+(len/2)-1;
		for(int idx=startIdx; idx<=endIdxHalf; idx++) {
		    byte btemp = buf[idx];
		    buf[idx] = buf[startIdx+endIdx-idx];
		    buf[startIdx+endIdx-idx]=btemp;
		}
	}

	// 4-byte BigEndian array (652 -> 0000028C)
	public static byte[] toIntArray(int value) {
		return new byte[] {
            (byte)(value >>> 24),
            (byte)(value >>> 16),
            (byte)(value >>> 8),
            (byte)(value)};
	}

	// 4-byte LittleEndian array (652 -> 8C020000)
	public static byte[] toIntArrayLE(int value) {
		return new byte[] {
            (byte)(value),
            (byte)(value >>> 8),
            (byte)(value >>> 16),
            (byte)(value >>> 24)};
	}
	
    public static int getFourCCInt(String text) {
    	// 4CC("cbcs") to integer(1667392371)
        int val = 0;
        for (int idx = 0; idx < 4; idx++) {
            val <<= 8;
            val |= text.charAt(idx);
        }
        return val;
    }
    
    public static String getFourCC(int value) {
    	// 4CC integer(1667392371) to text("cbcs")     	
        String s = "";
        s += (char) ((value >> 24) & 0xFF);
        s += (char) ((value >> 16) & 0xFF);
        s += (char) ((value >> 8) & 0xFF);
        s += (char) (value & 0xFF);
        return s;
	}	

    public static String getUUID() {
    	// create UUID like "6f1f2c09-ce9d-4194-bb8c-709bd9f51231"
    	UUID uuid = UUID.randomUUID();
    	return uuid.toString();
    }
    
	public static boolean isWindows() {
		return System.getProperty("os.name").toLowerCase(Locale.US).indexOf("windows") != -1;
	}
	
	public static byte[] trimArray(byte[] arr, int trimLeadingBytes, int trimTrailingBytes) {
		byte[] newArr = new byte[arr.length-trimLeadingBytes-trimTrailingBytes];
		System.arraycopy(arr, trimLeadingBytes, newArr, 0, newArr.length);
		return newArr;
	}
		
	/**
	 * Parse name-value pairs to HashMap
	 * @param nameValues string of "name=value" pairs
	 * @return 
	 */
	public static Map<String,String> createMap(String nameValues) {
		Map<String,String> map = new HashMap<>();
		if (nameValues == null) return map;
		
        // "key1=val1 \n key2=val""
        // skip comment and empty lines
		BufferedReader sr = new BufferedReader(new StringReader(nameValues));
        String line;
        try {
            while( (line=sr.readLine()) != null) {
            	if (line.length() < 1) continue;
            	line = line.trim();
            	if (line.charAt(0) == '#') continue;
                int idx = line.indexOf('=');
                if (idx < 1) continue;
                String key = line.substring(0, idx).trim();
                String val = line.substring(idx+1).trim();
                if (!val.isEmpty()) {
                	// drop quotes from value part somekey="value" -> somekey=value
	    			if (val.charAt(0)=='"' && val.charAt(val.length()-1)=='"')
	    				val = val.substring(1, val.length()-1);
                }
                map.put(key, val);
            }
            return map;
		} catch (Exception ex) {
			throw new IllegalArgumentException(ex.getMessage(), ex);
		}
	}

	/**
	 * Concatenate values.
	 * @param values
	 * @param delim
	 * @return
	 */
	public static String implodeList(List<String> values, String delim) {
        StringBuilder sb = new StringBuilder();
        for(String value : values) {
        	if (sb.length()>0) sb.append(delim+value);
        	else sb.append(value);
        }
        return sb.toString();		
	}

	/**
	 * Explode to list, skip empty tokens in a values string.
	 */
	public static List<String> getList(String values, String delim) {
		List<String> list = new ArrayList<String>(8);
		for(String val : values.split(delim)) {
			val = val.trim();
			if(!val.isEmpty()) list.add(val);
		}
		return list;
	}
	
	public static int indexOfArray(String[] arr, String val) {
		for(int idx=0; idx<arr.length; idx++) {
			if(arr[idx].equalsIgnoreCase(val)) return idx;
		}
		return -1;
	}

	/**
	 * Copy file.
	 * @param sFile	source
	 * @param dFile	destination
	 * @throws IOException
	 */
	public static void copyFile(File sFile, File dFile) throws IOException {
		FileInputStream fis=null;
		FileOutputStream fos=null;
		FileChannel fcin, fcout;
		fcin = fcout = null;
		try {
			fis = new FileInputStream(sFile);
			fcin = fis.getChannel();
			fos = new FileOutputStream(dFile);			
	        fcout = fos.getChannel();
	        // http://developer.java.sun.com/developer/bugParade/bugs/4643189.html
	        int maxCount = (64 * 1024 * 1024) - (32 * 1024);
	        long size = fcin.size();
	        long position = 0;
	        while (position < size) {
	            position += fcin.transferTo(position, maxCount, fcout);
	        }
		} finally {
			try { if (fcout!=null) fcout.close(); } catch (IOException e) { }
			try { if (fcin!=null) fcin.close(); } catch (IOException e) { }
			try { if (fis!=null) fis.close(); } catch (IOException e) { }
			try { if (fos!=null) fos.close(); } catch (IOException e) { }
		}

		// clone attributes
        dFile.setReadable(sFile.canRead());
        dFile.setWritable(true);// always writable by this user sFile.canWrite());
        dFile.setExecutable(sFile.canExecute());
        dFile.setLastModified(sFile.lastModified());
	}
	
	public static void moveFile(File sFile, File dFile) throws IOException {
		// rename succeeded, src and dest files were in a same folder
		if (sFile.renameTo(dFile))
			return;		
		copyFile(sFile, dFile);
		sFile.delete();
	}	
	
	public static StringBuilder loadTextFile(File file, String charset) throws IOException {
		FileInputStream fis=new FileInputStream(file);
		try {
			StringBuilder sb=new StringBuilder();
			Reader reader=new InputStreamReader(fis, charset);
			char[] buf=new char[8*1024];
			while(true) {
				int read=reader.read(buf);
				if (read<0) break;
				sb.append(buf, 0, read);
			}
			reader.close();
			return sb;
		} finally {
			try{ fis.close(); } catch(Exception e){}
		}		
	}
	
	/**
	 * Read binary file.
	 */
	public static byte[] readFile(File file) throws IOException {
		ByteArrayOutputStream baos = new ByteArrayOutputStream();
		FileInputStream fis = new FileInputStream(file);
		try {
			byte[] buf=new byte[2*1024];
			int read;
			while( (read=fis.read(buf))>-1 )
				baos.write(buf, 0, read);
		} finally {
			fis.close();
		}
		return baos.toByteArray();
	}
		
	public static void saveFile(File file, byte[] b) throws IOException {
		BufferedOutputStream bos = null;
		FileOutputStream fos = null;		
		fos = new FileOutputStream(file, false);
		try {
			bos = new BufferedOutputStream(fos);
			bos.write(b);
			bos.flush();
		} catch (IOException ex) {
			throw ex;
		} finally {
			try { bos.close(); fos.close(); } catch (Exception e) {}
		}		
	}
	
    /**
     * Returns path of given class, class must be inside jar file.
     * @param aclass
     * @return	application library path /my/app/lib
     */
    public static String getLibraryFolder(Class<?> aclass) {
		CodeSource codeSource = aclass.getProtectionDomain().getCodeSource();
		File jarFile;
		if (codeSource.getLocation() != null) {
			try {
				jarFile = new File(codeSource.getLocation().toURI());
			} catch(Exception ex) {
				throw new IllegalArgumentException(ex.getMessage(), ex);
			}
		} else {
			String path = aclass.getResource(aclass + ".class").getPath();
			String jarFilePath = path.substring(path.indexOf(":") + 1, path.indexOf("!"));
		    jarFile = new File(jarFilePath);
		}
		return jarFile.getParentFile().getAbsolutePath();
    }

    
	/**
	 * Removes things like &lt;segment&gt;/../ or ./, as described in RFC 2396 in
	 * step 6 of section 5.2. This always return "unix" compatible path.
	 */
	public static String normalizePath(String path, boolean normalizeFolders) {
		   	if (path == null || path.length() < 1)
		   		return path;
		   	path = path.replace('\\', '/'); // Win '\' to Unix '/' separator
		   	
		   	if (normalizeFolders) {
			   // replace all /./ with /
		       int i = path.indexOf("/./");
		       while (i > -1) {
		           path = path.substring(0, i + 1) + path.substring(i + 3);
		           i = path.indexOf("/./");
		       }
		
		       if (path.endsWith("/."))
		           path = path.substring(0, path.length() - 1);
		
		       int f = path.indexOf("/../");
		       while (f > 0) {
		           int sb = path.lastIndexOf("/", f - 1);
		           if (sb > -1)
		               path = path.substring(0, sb + 1) + (path.length() >= f + 4 ? path.substring(f + 4) : "");
				   else
				       path = "/" + (path.length() >= f + 4 ? path.substring(f + 4) : "");
		           f = path.indexOf("/../");
		       }
		
		       if (path.length() > 3 && path.endsWith("/..")) {
		           int sb = path.lastIndexOf("/", path.length() - 4);
				   if (sb < 0) {
					      path = "/" + path;
		 			      sb = 0;
				   }
		           String segment = path.substring(sb, path.length() - 3);
		           if (!segment.equals("..")) {
		               path = path.substring(0, sb + 1);
		           }
		       }
		   	}

		   	// remove trailing '/' char
		   	if (path.charAt(path.length()-1) == '/')
		   		path = path.substring(0, path.length()-1);
	       
		   	return path;
	}   	

	
}
