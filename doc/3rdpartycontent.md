# Hosting Third Party Streams in the HbbTV DASH-DRM Reference App

HbbTV is happy to extend its DASH-DRM reference application to include references to streams from others that are relevant to the HbbTV ecosystem. This document captures our expectations for streams to be considered for this. 

- HbbTV needs to be given the following;
    * The URL for MPD for each stream (HbbTV is not interested in hosting streams from others, only in referring to streams hosted by others), 
    * A description of how the provider of the stream is to be credited in the application - name, logo and potentially a longer description or a link to the stream provider's web site.
    * A short technical description of the stream - codecs, DRM system(s), packaging as well as any particular unique or special attributes of the stream. Does it test something specific and, if so, what?  Bearing in mind a tester may not have english as a first language, provide a clear explanation of what "playing correctly" should look/sound like.
* The stream needs to have been tested and found to work with HbbTV implementations.
    * Note 1: For widest HbbTV applicability, the stream needs to work with the native DASH player built into HbbTV TV sets before MSE and EME were introduced. Also TLS 1.3 should not be required.
    * Note 2: Working on a Smart TV supporting HbbTV may not be the same as working on an HbbTV implementation as the DASH playback may be different between Smart TV mode and HbbTV mode.
* The stream should have been validated with the DASH-IF validator.
    * Any remaining errors reported by the validator should be believed to be errors with the validator and should have been reported in their github repo.
* A mechanism should be provided by which people can report technical issues with the stream, either a contact person or some kind of issue tracking mechanism that is monitored.

The user interface of our DASH-DRM reference app consists of a number of tabs. Our current idea is to have a tab for third party streams in the style of the current tabs across the top of the screen. This tab would be on the far right hand end of our current tabs.

A dedicated tab for streams from a particular company could also be considered if that company would make a significant number of streams available.
