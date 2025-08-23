// This file contains the JavaScript code for the project using jQuery.

// Improved smoothing function to eliminate all fluctuations
function smoothPercentage(current, previous, max) {
    // If it's a significant change (forward progress), accept it
    if (current > previous + 0.5) {
        // Round to 1 decimal place for stability
        return Math.floor(current * 10) / 10;
    }
    
    // If it's a backwards movement, reject it completely
    if (current < previous) {
        return previous;
    }
    
    // For tiny forward increments, use previous to avoid micro-jitter
    return previous;
}

$(document).ready(function () {
    console.log("Document ready");
    
    // Initialize player variables
    let lastPercentage = 0;
    let lastUpdateTime = 0;
    let stablePercentage = 0;
    
    // CRITICAL FIX: Remove CSS transitions from progress bar
    $('<style>')
        .prop('type', 'text/css')
        .html(`
            .progress-bar-elapsed {
                transition: none !important;
            }
            .progress-bar-handle {
                transition: opacity 0.2s !important;
                transition-property: opacity !important;
            }
        `)
        .appendTo('head');
    
    try {
        // Initialize jPlayer with better error handling
        $("#jquery_jplayer_1").jPlayer({
            ready: function () {
                console.log("jPlayer ready");
                $(this).jPlayer("setMedia", {
                    mp3: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
                });
            },
            swfPath: ".",
            supplied: "mp3",
            wmode: "window",
            smoothPlayBar: false, // Turn off jPlayer's built-in smoothing
            keyEnabled: true,
            volume: 0.8,
            
            timeupdate: function(event) {
                const now = Date.now();
                
                // Get status but update UI less frequently
                const status = event.jPlayer.status;
                const currentTime = status.currentTime || 0;
                const duration = status.duration || 0;
                const rawPercent = status.currentPercentAbsolute || 0;
                
                // Always update time display
                const formatTime = function(seconds) {
                    const mins = Math.floor(seconds / 60);
                    const secs = Math.floor(seconds % 60);
                    return (mins < 10 ? '0' : '') + mins + ':' + (secs < 10 ? '0' : '') + secs;
                };
                
                // Update time displays directly
                $('.jp-current-time').text(formatTime(currentTime));
                $('.jp-duration').text(formatTime(duration));
                
                // Only update progress bar periodically or when paused
                if (now - lastUpdateTime > 500 || status.paused) {
                    lastUpdateTime = now;
                    
                    // Apply super-aggressive smoothing to prevent any backward movement
                    stablePercentage = smoothPercentage(rawPercent, stablePercentage, 100);
                    
                    // Update the progress bar only during playback
                    if (!status.paused) {
                        requestAnimationFrame(function() {
                            $('.jp-play-bar').css('width', stablePercentage + '%');
                            
                            // If there's a handle, update its position
                            if ($('.progress-bar-handle').length) {
                                $('.progress-bar-handle').css('left', stablePercentage + '%');
                            }
                        });
                    }
                }
            },
            
            play: function() {
                $('.jp-play').hide();
                $('.jp-pause').show();
                $('.playlist-item.mdc-list-item--activated .play-icon').text('pause');
            },
            
            pause: function() {
                $('.jp-pause').hide();
                $('.jp-play').show();
                $('.playlist-item.mdc-list-item--activated .play-icon').text('play_arrow');
            },
            
            ended: function() {
                $('.jp-pause').hide();
                $('.jp-play').show();
                
                // Play next track
                const $items = $('.playlist-item');
                const currentIndex = $('.playlist-item.mdc-list-item--activated').index();
                const nextIndex = currentIndex + 1;
                
                if (nextIndex < $items.length) {
                    $items.eq(nextIndex).click();
                }
            },
            
            // Handle seeking completion to update UI immediately
            seeked: function(event) {
                const percent = event.jPlayer.status.currentPercentAbsolute || 0;
                stablePercentage = percent; // Update our stable percentage
                
                // Force immediate update after seeking
                $('.jp-play-bar').css('width', percent + '%');
                if ($('.progress-bar-handle').length) {
                    $('.progress-bar-handle').css('left', percent + '%');
                }
            }
        });
        
        // Direct handler for play button
        $('.jp-play').on('click', function() {
            console.log("Play clicked");
            $("#jquery_jplayer_1").jPlayer("play");
            return false;
        });
        
        // Direct handler for pause button
        $('.jp-pause').on('click', function() {
            console.log("Pause clicked");
            $("#jquery_jplayer_1").jPlayer("pause");
            return false;
        });
        
        // Seeking in track - improved implementation
        $('.jp-seek-bar').on('click', function(e) {
            const offset = $(this).offset();
            const x = e.pageX - offset.left;
            const w = $(this).width();
            const percent = x / w * 100;
            
            // Update the progress bar immediately for better UX
            document.querySelector('.jp-play-bar').style.width = percent + '%';
            
            // Then tell jPlayer to seek
            $("#jquery_jplayer_1").jPlayer("playHead", percent);
            return false;
        });
        
        // Volume control - simplest implementation
        $('.jp-volume-bar').on('click', function(e) {
            const offset = $(this).offset();
            const x = e.pageX - offset.left;
            const w = $(this).width();
            const volume = x / w;
            
            console.log(`Setting volume to ${volume}`);
            $("#jquery_jplayer_1").jPlayer("volume", volume);
            $('.jp-volume-bar-value').width(volume * 100 + '%');
            return false;
        });
        
        // Playlist click handlers
        $('.playlist-item').on('click', function() {
            const src = $(this).data('src');
            const title = $(this).find('.mdc-list-item__primary-text').text();
            const artist = $(this).find('.mdc-list-item__secondary-text').text();
            
            // Update active state
            $('.playlist-item').removeClass('mdc-list-item--activated');
            $(this).addClass('mdc-list-item--activated');
            
            // Update display
            $('.track-title').text(title);
            $('.artist-name').text(artist);
            
            // Reset progress bar to avoid jumps
            document.querySelector('.jp-play-bar').style.width = '0%';
            
            // Load and play
            $("#jquery_jplayer_1").jPlayer("setMedia", {
                mp3: src
            }).jPlayer("play");
            
            return false;
        });
        
        // Previous track button handler
        $('.jp-previous').on('click', function() {
            console.log("Previous button clicked");
            
            // Find the current track in the playlist
            const $items = $('.playlist-item');
            const currentIndex = $('.playlist-item.mdc-list-item--activated').index();
            
            // Calculate the previous index with wraparound
            let prevIndex = currentIndex - 1;
            if (prevIndex < 0) {
                prevIndex = $items.length - 1; // Go to last track if at the beginning
            }
            
            // Click on the previous playlist item to play it
            $items.eq(prevIndex).click();
            return false;
        });
        
        // Next track button handler
        $('.jp-next').on('click', function() {
            console.log("Next button clicked");
            
            // Find the current track in the playlist
            const $items = $('.playlist-item');
            const currentIndex = $('.playlist-item.mdc-list-item--activated').index();
            
            // Calculate the next index with wraparound
            let nextIndex = currentIndex + 1;
            if (nextIndex >= $items.length) {
                nextIndex = 0; // Go back to first track if at the end
            }
            
            // Click on the next playlist item to play it
            $items.eq(nextIndex).click();
            return false;
        });

    } catch (err) {
        console.error("CRITICAL ERROR:", err);
    }
});