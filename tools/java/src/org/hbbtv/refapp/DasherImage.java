package org.hbbtv.refapp;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;
import java.util.Iterator;
import java.util.Locale;
import java.util.Map;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.Image;
import java.awt.image.BufferedImage;
import java.awt.image.Raster;

import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageInputStream;
import javax.imageio.stream.ImageOutputStream;

/**
 * Image tools.
 * Scale input image to 1..n jpg or png files:
   java -cp "/dasher/lib/*" org.hbbtv.refapp.DasherImage input="/tmp/image.png" output="/data/files/" \
     image.1=320x180 image.2=640x360 image.3=1280x720 image.filename="image_{w}x{h}.png"
     image.keepaspect=1
 */
public class DasherImage {

	public static void main(String[] cmdargs) throws Exception {
		// Input is "/images/image.jpg" or "/images/image.png" file
		Map<String,String> params = Utils.parseParams(cmdargs);

		String val = params.get("input");
		File inputFile = !val.isEmpty() ? new File(val) : null;
		if(inputFile==null || !inputFile.exists() || !inputFile.isFile())
			throw new FileNotFoundException("Input "+val+" not found");

		// Output folder "/srv/www/data/images/"
		val = Utils.normalizePath(Utils.getString(params, "output", "", true), true);
		if (val.isEmpty() || val.equals("/")) 
			throw new IllegalArgumentException("Invalid output value '" + val +"'");
		if (!val.endsWith("/")) val+="/";
		File outputFolder = new File(val);
		outputFolder.mkdirs();
		
		boolean keepAspect = Utils.getBoolean(params, "image.keepaspect", true);		
		String filename = Utils.getString(params, "image.filename", "image_{w}x{h}.jpg", true);
		
		for(int idx=1; ; idx++) {
			val = Utils.getString(params, "image."+idx, "", true); // image.1=640x360
			if (val.isEmpty()) break;
			int delim = val.indexOf('x');
			int width = Integer.parseInt(val.substring(0,delim));
			int height= Integer.parseInt(val.substring(delim+1));

			String outFilename = filename.replace("{w}", ""+width)
					.replace("{h}", ""+height)
					.replace("{idx}", "1");
			scaleImage(inputFile, new File(outputFolder, outFilename), keepAspect, width, height);
		}
	}
	
	/*public static void scaleImage(File file, File outputFile, boolean keepAspect, String size) throws Exception {
		int delim = size.indexOf('x'); // "640x360"
		int width = Integer.parseInt(size.substring(0,delim));
		int height= Integer.parseInt(size.substring(delim+1));
		scaleImage(file, outputFile, width, height);
	}*/

	/**
	 * Scale image file.
	 * @param file
	 * @param outputFile
	 * @param width
	 * @param height
	 * @throws Exception
	 */
	public static void scaleImage(File file, File outputFile, boolean keepAspect, int width, int height) throws Exception {
        BufferedImage image;
        try {
        	// Java ImageIO can only read RGB-JPEGs, do magic for CMYK-JPEG files,
        	// http://stackoverflow.com/questions/2408613/problem-reading-jpeg-image-using-imageio-readfile-file
            InputStream fileis = new FileInputStream(file);
            try {
                image = ImageIO.read(fileis);
            } finally {
                try { fileis.close(); } catch (Exception ex) {}
            }
        } catch (javax.imageio.IIOException ex) {
        	image = readCMYKImage(file);
        }

        int[] newwh = { width, height }; //calcExactScaledSize(image, width, height);
        if(keepAspect)
        	image = scaleToSize(image, newwh[0], newwh[1], true, true, null);
        else
        	image = scaleToSize(image, newwh[0], newwh[1], false, false, null);
        
		String format = outputFile.getName().toLowerCase(Locale.US).endsWith(".png") ? "png" : "jpeg";
        if (format.equals("jpeg")) {
            // make sure image is RGB, jpeg does not support alpha channel
        	byte[] bytes=createJPEGBytes(image, 0.80f);
        	Utils.saveFile(outputFile, bytes);
        } else {
        	ImageIO.write(image, format, outputFile);
        }
	}
	
	/**
	 * Scale to given canvas size.
	 * @param image			original image
	 * @param thumbWidth	new canvas width
	 * @param thumbHeight	new canvas height
	 * @param keepAspectRatio	keep aspect ratio of the original image
	 * @param center		center scaled image to new canvas
	 * @param bgColor		background color of new canvas
	 * @return
	 */
	private static BufferedImage scaleToSize(BufferedImage image, 
			int thumbWidth, int thumbHeight, boolean keepAspectRatio, boolean center,
			Color bgColor) {
		int w, h;
		if (keepAspectRatio) {
			double thumbRatio = (double)thumbWidth / (double)thumbHeight;
		    int imageWidth = image.getWidth();
		    int imageHeight = image.getHeight();
		    double imageRatio = (double)imageWidth / (double)imageHeight;
		    if (thumbRatio < imageRatio) {
		    	w = thumbWidth;
		    	h = (int)(thumbWidth / imageRatio);		    	
		    } else {
		    	w = (int)(thumbHeight * imageRatio)+1;
		    	h = thumbHeight;
		    }		
		} else {
			w = thumbWidth; h = thumbHeight;
		}
		
		// http://today.java.net/pub/a/today/2007/04/03/perils-of-image-getscaledinstance.html
		Image imageAWT = image.getScaledInstance(w, h, Image.SCALE_SMOOTH);		
		BufferedImage newImage = new BufferedImage(thumbWidth, thumbHeight, image.getType());
		Graphics2D g = newImage.createGraphics();
		/*g.setRenderingHint(RenderingHints.KEY_INTERPOLATION,
                RenderingHints.VALUE_INTERPOLATION_BICUBIC);
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING,
		   		   RenderingHints.VALUE_ANTIALIAS_ON);
        g.setRenderingHint(RenderingHints.KEY_FRACTIONALMETRICS,
		   RenderingHints.VALUE_FRACTIONALMETRICS_ON);*/

		if (bgColor != null) {
			g.setColor(bgColor);
			g.fillRect(0, 0, thumbWidth, thumbHeight);
		}
		
		if (center) {
			int x = (thumbWidth - w)/2;
			int y = (thumbHeight - h)/2;
			g.drawImage(imageAWT, x, y, null);
		} else {
			g.drawImage(imageAWT, 0, 0, null);
		}
		
		newImage.flush();
		g.dispose();
		return newImage;
	}	

    /**
     * ImageIO cannot read CMYK-jpegs, it throws IIOException(Unsupported Image Type).
     * This method tries to read cmyk image.
     * @param file
     * @return  image TYPE_4BYTE_ABGR
     * @throws Exception
     */
    private static BufferedImage readCMYKImage(File file) throws Exception {
        Iterator<ImageReader> readers = ImageIO.getImageReadersByFormatName("JPEG");
        ImageReader reader = null;
        while(readers.hasNext()) {
            reader = readers.next();
            if(reader.canReadRaster())
                break;
        }
        
        FileInputStream fis = new FileInputStream(file);
        try {
            ImageInputStream input = ImageIO.createImageInputStream(fis); 
            reader.setInput(input); // original CMYK-jpeg stream
            Raster raster = reader.readRaster(0, null); // read image raster 
            BufferedImage image = new BufferedImage(raster.getWidth(), raster.getHeight(), BufferedImage.TYPE_4BYTE_ABGR);
            image.getRaster().setRect(raster);
            return image;
        } finally {
            try { fis.close(); } catch(Exception ex) {}
        }
    }
    
	private static byte[] createJPEGBytes(BufferedImage image, float quality) 
            throws IOException {        
        ImageWriter writer = null;
        Iterator<ImageWriter> iter = ImageIO.getImageWritersByFormatName("jpg"); // find jpeg writer
        if (iter.hasNext())
            writer = (ImageWriter)iter.next();
        
        // prepare output bytes
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        ImageOutputStream ios = ImageIO.createImageOutputStream(baos);
        writer.setOutput(ios);

        ImageWriteParam iwp = writer.getDefaultWriteParam();
        iwp.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
        iwp.setCompressionQuality(quality);
        
        // write the image
        image = toBufferedImage(image, BufferedImage.TYPE_INT_RGB, null);
        writer.write(null, new IIOImage(image, null, null), iwp);

        // release resources
        ios.flush();
        writer.dispose();
        ios.close();
        
        return baos.toByteArray();
    }    
    
	/**
	 * Calculate exact downscaled size for the image 
	 * keeping the original aspect ratio. 
	 * @param image
	 * @param thumbWidth
	 * @param thumbHeight
	 * @return int[2] of width,height
	 */
	/* private static int[] calcExactScaledSize(BufferedImage image, int thumbWidth, int thumbHeight) {
        int w, h;
        double thumbRatio = (double)thumbWidth / (double)thumbHeight;
	    int imageWidth = image.getWidth();
	    int imageHeight = image.getHeight();
	    double imageRatio = (double)imageWidth / (double)imageHeight;
	    if (thumbRatio < imageRatio) {
	        w = thumbWidth;
	        h = (int)(thumbWidth / imageRatio);             
	    } else {
	        w = (int)(thumbHeight * imageRatio)+1;
	        h = thumbHeight;
	    }
	    return new int[] { w, h };
	}  */  
    
	/**
	 * Create BufferedImage from Image.
	 * @param image	original image
	 * @param type	type of new BufferedImage.TYPE_XXXX type
	 * @return		
	 */
	private static BufferedImage toBufferedImage(Image image, int type, Color bgColor) {
		if (image instanceof BufferedImage && ((BufferedImage)image).getType() == type)
			return (BufferedImage)image;

		int width = image.getWidth(null);
		int height = image.getHeight(null);
		BufferedImage imageNew = new BufferedImage(width, height, type);
		Graphics2D g = imageNew.createGraphics();
		if (bgColor != null) {
			g.setColor(bgColor);
			g.fillRect(0, 0, width, height);
		}
		g.drawImage(image, 0, 0, null);
		g.dispose();
		imageNew.flush();
		return imageNew;
	}    	
}
