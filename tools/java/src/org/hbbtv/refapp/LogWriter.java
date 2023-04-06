package org.hbbtv.refapp;

import java.io.*;

/**
 * Simple logging file writer.
 */
public class LogWriter {
	private FileOutputStream fos;
	private byte[] NLb;
	
	public LogWriter() {}

	/**
	 * Open a logging file or use STDOUT.
	 * @param file	output file or NULL to use System.out.
	 * @param  append
	 * @throws IOException
	 */
	public void openFile(File file, boolean append) throws IOException {
		String NL=System.getProperty("line.separator", "\r\n");
		NLb = NL.getBytes("ISO-8859-1");
		
		if (file==null) {
			close();
		} else {
			if(file.exists() && file.length()>0 && append) {
				fos = new FileOutputStream(file,append);
			} else {
				fos = new FileOutputStream(file);
				fos.write( new byte[] { (byte)0xEF, (byte)0xBB, (byte)0xBF } ); // UTF8 BOM marker
			}
		}
	}
	
	public void close() {
		try { 
			if (fos!=null) fos.close();
			fos=null;
		} catch (Exception ex) { }
	}

	public void println(String value) throws IOException {
		if (fos==null) {
			System.out.println(value);
		} else {
			fos.write(value.getBytes("UTF-8"));
			fos.write(NLb);
		}
	}

	public void print(String value) throws IOException {
		if (fos==null) {
			System.out.print(value);
		} else {
			fos.write(value.getBytes("UTF-8"));
		}
	}
	
}
