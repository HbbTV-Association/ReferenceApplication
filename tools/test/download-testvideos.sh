#!/bin/sh
## Download test videos, transcode to 1920x1080p/25fps
## Usage: Create /videos/ folder and run this script on it
##    mkdir /videos
##    cd /videos
##    sh /refapp/tools/test/download-testvideos.sh

BASEDIR=$(dirname $0)

function download() {
  local output=$2
  local outputtmp=$output
  if [ "$3" == "unzip" ]; then outputtmp=${output}.zip; fi
  echo Download $1 to $output
  wget "$1" -O $outputtmp
  if [ "$3" == "unzip" ]; then 
    unzip $outputtmp
	rm $outputtmp
  fi
}

function transcode() {
  if [ "$3" == "1920x1080" ]; then
    ## transcode to 1080p, 25FPS
    C:/projects/media-autobuild_suite/media-autobuild_suite/local64/bin-video/ffmpeg.exe -hide_banner -i "$1" -threads 4 -preset slow \
	  -c:v libx264 -profile:v main -level 4.0 -b:v 3500k -pix_fmt yuv420p -r 25 \
	  -c:a aac -strict experimental -b:a 128k -af aresample=48000 -ar 48000 -ac 2 \
	  -y "$2"
  elif [ "$3" == "1920x1080x240to169" ]; then
    ## transcode 2.40:1 to 16:9 aspect ratio with 1080p letterbox padding, 25FPS
    C:/projects/media-autobuild_suite/media-autobuild_suite/local64/bin-video/ffmpeg.exe -hide_banner -i "$1" -threads 4 -preset slow -crf 18 \
	  -c:v libx264 -profile:v main -level 4.0 -b:v 3500k -pix_fmt yuv420p -r 25 \
	  -aspect 16:9 -vf "scale=(iw*sar)*min(1920/(iw*sar)\,1080/ih):ih*min(1920/(iw*sar)\,1080/ih),pad=1920:1080:(1920-iw*min(1920/iw\,1080/ih))/2:(1080-ih*min(1920/iw\,1080/ih))/2" \
	  -c:a aac -strict experimental -b:a 128k -af aresample=48000 -ar 48000 -ac 2 \
	  -y "$2"
  fi
}

## Caminandes: http://www.caminandes.com/
download "http://www.caminandes.com/download/01_llama_drama_1080p.zip" "01_llama_drama_1080p.mp4" unzip
transcode "01_llama_drama_1080p.mp4" "01_llama_drama_1080p_25fps.mp4" "1920x1080"

download "http://www.caminandes.com/download/02_gran_dillama_1080p.zip" "02_gran_dillama_1080p.mp4" unzip
transcode "02_gran_dillama_1080p.mp4" "02_gran_dillama_1080p_25fps.mp4" "1920x1080"

download "http://www.caminandes.com/download/03_caminandes_llamigos_1080p.zip" "03_caminandes_llamigos_1080p.mp4" unzip
transcode "03_caminandes_llamigos_1080p.mp4" "03_caminandes_llamigos_1080p_25fps.mp4" "1920x1080"

## Tears of Steel: https://mango.blender.org/download/
download "http://ftp.nluug.nl/pub/graphics/blender/demo/movies/ToS/ToS-4k-1920.mov" "tears_of_steel_1080p.mov" unzipNo
transcode "tears_of_steel_1080p.mov" "tears_of_steel_1080p_25fps.mp4" "1920x1080x240to169"
