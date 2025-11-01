// ===================================================================
// MEDIA PLAYER APPLICATION - MAIN JAVASCRIPT FILE
// ===================================================================
// This file contains all the JavaScript code that makes the media player work.
// It uses jQuery (a JavaScript library) and jPlayer (an HTML5 audio player).

// ===================================================================
// HELPER FUNCTION: SMOOTH PROGRESS BAR UPDATES
// ===================================================================
// This function prevents the progress bar from jumping around or moving backwards
// during audio playback, which can happen due to network buffering issues.
function smoothPercentage(current, previous, max) {
    // If the current position is significantly ahead of the previous position,
    // it means the song is actually progressing forward - accept this change
    if (current > previous + 0.5) {
        // Round to 1 decimal place to avoid tiny fluctuations
        // Math.floor(current * 10) / 10 rounds down to 1 decimal place
        return Math.floor(current * 10) / 10;
    }
    
    // If the current position is behind the previous position,
    // it's likely a network glitch - ignore it and keep the previous value
    if (current < previous) {
        return previous;
    }
    
    // For very small forward movements, keep the previous value
    // to avoid micro-jitter in the progress bar
    return previous;
}

// ===================================================================
// DOCUMENT READY EVENT
// ===================================================================
// This code runs when the HTML document has finished loading
// $(document).ready() is a jQuery function that waits for the page to be ready
$(document).ready(function () {
    console.log("Document ready"); // Debug message to browser console
    
    // ==================================f=================================
    // SHUFFLE AND REPEAT STATE
    // ===================================================================
    let isShuffle = false;
    let isRepeat = false;
    function getShuffledIndex(currentIndex, length) {
        let indices = Array.from({length}, (_, i) => i);
        indices.splice(currentIndex, 1);
        return indices[Math.floor(Math.random() * indices.length)];
    }
    // INITIALIZE VARIABLES
    // ===================================================================
    // These variables track the progress bar state to prevent glitches
    let lastPercentage = 0;      // Last progress percentage we displayed
    let lastUpdateTime = 0;      // When we last updated the progress bar
    let stablePercentage = 0;    // The "stable" percentage without glitches
    
    // ===================================================================
    // CRITICAL CSS FIX FOR SMOOTH PROGRESS BAR
    // ===================================================================
    // This removes CSS animations from the progress bar to prevent conflicts
    // with our JavaScript-controlled updates
    $('<style>')
        .prop('type', 'text/css')  // Set the style tag type
        .html(`
            .progress-bar-elapsed {
                transition: none !important;  /* Remove all CSS transitions */
            }
            .progress-bar-handle {
                transition: opacity 0.2s !important;  /* Only animate opacity */
                transition-property: opacity !important;
            }
        `)
        .appendTo('head');  // Add this CSS to the page head
    
    // ===================================================================
    // JPLAYER INITIALIZATION AND CONFIGURATION
    // ===================================================================
    try {
        // Initialize the jPlayer audio player with our settings
        $("#jquery_jplayer_1").jPlayer({
            
            // ===================================================================
            // PLAYER READY EVENT
            // ===================================================================
            // This runs when jPlayer has finished loading and is ready to use
            ready: function () {
                console.log("jPlayer ready");
                // Load the first song automatically when the player is ready
                $(this).jPlayer("setMedia", {
                    mp3: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
                });
            },
            
            // ===================================================================
            // JPLAYER CONFIGURATION OPTIONS
            // ===================================================================
            swfPath: ".",           // Path for Flash fallback (older browsers)
            supplied: "mp3",        // Audio format we're providing
            wmode: "window",        // Flash window mode
            smoothPlayBar: false,   // Turn off jPlayer's built-in smoothing (we do our own)
            keyEnabled: true,       // Allow keyboard controls
            volume: 0.8,           // Default volume (80%)
            
            // ===================================================================
            // TIME UPDATE EVENT (MOST IMPORTANT!)
            // ===================================================================
            // This event fires continuously while audio is playing
            // It's responsible for updating the progress bar and time displays
            timeupdate: function(event) {
                const now = Date.now();  // Current timestamp in milliseconds
                
                // Get the current status from jPlayer
                const status = event.jPlayer.status;
                const currentTime = status.currentTime || 0;        // Current playback time
                const duration = status.duration || 0;              // Total track length
                const rawPercent = status.currentPercentAbsolute || 0; // Raw progress percentage
                
                // ===================================================================
                // UPDATE TIME DISPLAYS
                // ===================================================================
                // Helper function to format seconds into MM:SS format
                const formatTime = function(seconds) {
                    const mins = Math.floor(seconds / 60);          // Get minutes
                    const secs = Math.floor(seconds % 60);          // Get remaining seconds
                    // Add leading zeros if needed (e.g., "01:05" instead of "1:5")
                    return (mins < 10 ? '0' : '') + mins + ':' + (secs < 10 ? '0' : '') + secs;
                };
                
                // Update the time displays in the UI
                $('.jp-current-time').text(formatTime(currentTime));  // Current time
                $('.jp-duration').text(formatTime(duration));         // Total duration
                
                // ===================================================================
                // UPDATE PROGRESS BAR (WITH THROTTLING)
                // ===================================================================
                // Only update the progress bar every 500ms OR when paused
                // This prevents too many updates which can cause performance issues
                if (now - lastUpdateTime > 500 || status.paused) {
                    lastUpdateTime = now;  // Remember when we last updated
                    
                    // Apply our smoothing function to prevent glitches
                    stablePercentage = smoothPercentage(rawPercent, stablePercentage, 100);
                    
                    // Only update the visual progress bar when actually playing
                    if (!status.paused) {
                        // Use requestAnimationFrame for smooth visual updates
                        // This syncs with the browser's refresh rate for smooth animation
                        requestAnimationFrame(function() {
                            // Update the progress bar width
                            $('.jp-play-bar').css('width', stablePercentage + '%');
                            
                            // If there's a draggable handle, update its position too
                            if ($('.progress-bar-handle').length) {
                                $('.progress-bar-handle').css('left', stablePercentage + '%');
                            }
                        });
                    }
                }
            },
            
            // ===================================================================
            // PLAY EVENT
            // ===================================================================
            // This runs when playback starts
            play: function() {
                // Hide the play button, show the pause button
                $('.jp-play').hide();
                $('.jp-pause').show();
                // Update the playlist to show a pause icon for the current track
                $('.playlist-item.mdc-list-item--activated .play-icon').text('pause');
            },
            
            // ===================================================================
            // PAUSE EVENT
            // ===================================================================
            // This runs when playback is paused
            pause: function() {
                // Hide the pause button, show the play button
                $('.jp-pause').hide();
                $('.jp-play').show();
                // Update the playlist to show a play icon for the current track
                $('.playlist-item.mdc-list-item--activated .play-icon').text('play_arrow');
            },
            
            // ===================================================================
            // TRACK ENDED EVENT
            // ===================================================================
            // This runs when a track finishes playing
            ended: function() {
                // Reset buttons to play state
                $('.jp-pause').hide();
                $('.jp-play').show();
                const $items = $('.playlist-item');
                const currentIndex = $('.playlist-item.mdc-list-item--activated').index();
                if (isRepeat) {
                    $items.eq(currentIndex).click();
                } else if (isShuffle) {
                    let nextIndex = getShuffledIndex(currentIndex, $items.length);
                    $items.eq(nextIndex).click();
                } else {
                    const nextIndex = currentIndex + 1;
                    if (nextIndex < $items.length) {
                        $items.eq(nextIndex).click();
                    }
                }
            },
            
            // ===================================================================
            // SEEK COMPLETED EVENT
            // ===================================================================
            // This runs when the user finishes seeking to a new position
            seeked: function(event) {
                const percent = event.jPlayer.status.currentPercentAbsolute || 0;
                stablePercentage = percent; // Update our stable percentage immediately
                
                // Force immediate visual update after seeking
                $('.jp-play-bar').css('width', percent + '%');
                if ($('.progress-bar-handle').length) {
                    $('.progress-bar-handle').css('left', percent + '%');
                }
            }
        });
        
        // ===================================================================
        // PLAY BUTTON CLICK HANDLER
        // ===================================================================
        // When the user clicks the play button
        $('.jp-play').on('click', function() {
            console.log("Play clicked");
            $("#jquery_jplayer_1").jPlayer("play");  // Tell jPlayer to start playing
            return false;  // Prevent default button behavior
        });
        
        // ===================================================================
        // PAUSE BUTTON CLICK HANDLER
        // ===================================================================
        // When the user clicks the pause button
        $('.jp-pause').on('click', function() {
            console.log("Pause clicked");
            $("#jquery_jplayer_1").jPlayer("pause");  // Tell jPlayer to pause
            return false;  // Prevent default button behavior
        });
        
        // ===================================================================
        // PROGRESS BAR SEEKING
        // ===================================================================
        // When the user clicks on the progress bar to jump to a specific position
        $('.jp-seek-bar').on('click', function(e) {
            // Calculate where the user clicked as a percentage
            const offset = $(this).offset();           // Get progress bar position on page
            const x = e.pageX - offset.left;          // X position of click relative to progress bar
            const w = $(this).width();                // Total width of progress bar
            const percent = x / w * 100;              // Convert to percentage
            
            // Update the progress bar immediately for better user experience
            document.querySelector('.jp-play-bar').style.width = percent + '%';
            
            // Tell jPlayer to seek to this position
            $("#jquery_jplayer_1").jPlayer("playHead", percent);
            return false;  // Prevent default behavior
        });
        
        // ===================================================================
        // VOLUME CONTROL
        // ===================================================================
        // When the user clicks on the volume bar (if implemented)
        $('.jp-volume-bar').on('click', function(e) {
            // Calculate volume level from click position
            const offset = $(this).offset();
            const x = e.pageX - offset.left;
            const w = $(this).width();
            const volume = x / w;  // Volume as decimal (0.0 to 1.0)
            
            console.log(`Setting volume to ${volume}`);
            // Set the volume in jPlayer
            $("#jquery_jplayer_1").jPlayer("volume", volume);
            // Update the visual volume indicator
            $('.jp-volume-bar-value').width(volume * 100 + '%');
            return false;
        });
        
        // ===================================================================
        // PLAYLIST ITEM CLICK HANDLERS
        // ===================================================================
        // When the user clicks on a song in the playlist
        $('.playlist-item').on('click', function() {
            // Get information about the clicked track
            const src = $(this).data('src');                                    // Audio file URL
            const title = $(this).find('.mdc-list-item__primary-text').text(); // Song title
            const artist = $(this).find('.mdc-list-item__secondary-text').text(); // Artist name
            
            // Update which track is marked as "active" in the playlist
            $('.playlist-item').removeClass('mdc-list-item--activated');  // Remove active from all
            $(this).addClass('mdc-list-item--activated');                 // Add active to clicked item
            
            // Update the main player display with the new track info
            $('.track-title').text(title);   // Update displayed song title
            $('.artist-name').text(artist);  // Update displayed artist name
            
            // Reset the progress bar to 0% to avoid visual jumps
            document.querySelector('.jp-play-bar').style.width = '0%';
            
            // Load the new audio file and start playing it
            $("#jquery_jplayer_1").jPlayer("setMedia", {
                mp3: src  // Set the audio source
            }).jPlayer("play");  // Chain the play command
            
            return false;  // Prevent default link behavior
        });
        
        // ===================================================================
        // PREVIOUS TRACK BUTTON
        // ===================================================================
        // When the user clicks the "previous" button
        $('.jp-previous').on('click', function() {
            console.log("Previous button clicked");
            const $items = $('.playlist-item');
            const currentIndex = $('.playlist-item.mdc-list-item--activated').index();
            let prevIndex;
            if (isShuffle) {
                prevIndex = getShuffledIndex(currentIndex, $items.length);
            } else {
                prevIndex = currentIndex - 1;
                if (prevIndex < 0) prevIndex = $items.length - 1;
            }
            $items.eq(prevIndex).click();
            return false;
        });
        
        // ===================================================================
        // NEXT TRACK BUTTON
        // ===================================================================
        // When the user clicks the "next" button
        $('.jp-next').on('click', function() {
            console.log("Next button clicked");
            const $items = $('.playlist-item');
            const currentIndex = $('.playlist-item.mdc-list-item--activated').index();
            let nextIndex;
            if (isShuffle) {
                nextIndex = getShuffledIndex(currentIndex, $items.length);
            } else {
                nextIndex = currentIndex + 1;
                if (nextIndex >= $items.length) nextIndex = 0;
            }
            $items.eq(nextIndex).click();
            return false;
        });

        // SHUFFLE BUTTON HANDLER
        $('.jp-shuffle').on('click', function() {
            isShuffle = !isShuffle;
            $(this).toggleClass('active', isShuffle);
        });

        // REPEAT BUTTON HANDLER
        $('.jp-repeat').on('click', function() {
            isRepeat = !isRepeat;
            $(this).toggleClass('active', isRepeat);
        });

        // ===================================================================
        // LIKE BUTTON HANDLER
        // ===================================================================
        // When the user clicks the like button for a track
        $('.like-button').on('click', function(e) {
            e.stopPropagation(); // Prevent the playlist item click event
            
            const $button = $(this);
            const $playlistItem = $button.closest('.playlist-item');
            const $icon = $button.find('.material-icons');
            
            // Toggle the liked state
            const isLiked = $playlistItem.data('liked') === 'true';
            const newLikedState = !isLiked;
            
            // Update the data attribute
            $playlistItem.data('liked', newLikedState.toString());
            $playlistItem.attr('data-liked', newLikedState.toString());
            
            // Update the icon (filled vs outlined heart)
            if (newLikedState) {
                $icon.text('favorite'); // Filled heart
                $button.addClass('liked');
            } else {
                $icon.text('favorite_border'); // Outlined heart
                $button.removeClass('liked');
            }
            
            console.log(`Track ${$playlistItem.find('.mdc-list-item__primary-text').text()} ${newLikedState ? 'liked' : 'unliked'}`);
            
            return false; // Prevent default behavior
        });

    } catch (err) {
        // If anything goes wrong, log the error to the browser console
        console.error("CRITICAL ERROR:", err);
    }
});

// ===================================================================
// END OF FILE
// ===================================================================
// This media player provides:
// 1. Play/pause/next/previous controls
// 2. Progress bar with seeking capability
// 3. Playlist navigation
// 4. Automatic track advancement
// 5. Smooth progress updates without glitches
// 6. Material Design UI integration