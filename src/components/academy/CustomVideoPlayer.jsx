import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Rewind, FastForward, Settings, Maximize } from 'lucide-react';

export default function CustomVideoPlayer({ url, poster }) {
    const videoRef = useRef(null);
    const containerRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentTime, setCurrentTime] = useState('0:00');
    const [duration, setDuration] = useState('0:00');
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [showControls, setShowControls] = useState(true);
    const [showSpeedMenu, setShowSpeedMenu] = useState(false);

    let controlsTimeout = null;

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const updateProgress = () => {
            const current = video.currentTime;
            const total = video.duration;
            setCurrentTime(formatTime(current));
            if (!isNaN(total)) {
                setDuration(formatTime(total));
                setProgress((current / total) * 100);
            }
        };

        const handleEscape = (e) => {
            if (e.key === 'Escape' && document.fullscreenElement) {
                document.exitFullscreen();
            }
        }

        video.addEventListener('timeupdate', updateProgress);
        video.addEventListener('loadedmetadata', updateProgress);
        document.addEventListener('keydown', handleEscape);

        return () => {
            video.removeEventListener('timeupdate', updateProgress);
            video.removeEventListener('loadedmetadata', updateProgress);
            document.removeEventListener('keydown', handleEscape);
            if (controlsTimeout) clearTimeout(controlsTimeout);
        };
    }, []);

    const formatTime = (timeInSeconds) => {
        const m = Math.floor(timeInSeconds / 60);
        const s = Math.floor(timeInSeconds % 60);
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const togglePlay = () => {
        if (videoRef.current.paused) {
            videoRef.current.play();
            setIsPlaying(true);
        } else {
            videoRef.current.pause();
            setIsPlaying(false);
        }
    };

    const handleSkip = (amount) => {
        videoRef.current.currentTime += amount;
    };

    const handleVolumeChange = (e) => {
        const val = parseFloat(e.target.value);
        setVolume(val);
        setIsMuted(val === 0);
        videoRef.current.volume = val;
    };

    const toggleMute = () => {
        setIsMuted(!isMuted);
        if (videoRef.current.volume > 0) {
            videoRef.current.volume = 0;
            setVolume(0);
        } else {
            videoRef.current.volume = 1;
            setVolume(1);
        }
    };

    const handleSpeedChange = (rate) => {
        setPlaybackRate(rate);
        videoRef.current.playbackRate = rate;
        setShowSpeedMenu(false);
    };

    const handleProgressBarClick = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        videoRef.current.currentTime = pos * videoRef.current.duration;
    };

    const handleMouseMove = () => {
        setShowControls(true);
        if (controlsTimeout) clearTimeout(controlsTimeout);
        controlsTimeout = setTimeout(() => {
            if (isPlaying) setShowControls(false);
        }, 3000);
    };

    const handleMouseLeave = () => {
        if (isPlaying) setShowControls(false);
    };

    const toggleFullScreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable fullscreen: ${err.message} (${err.name})`);
            });
        } else {
            document.exitFullscreen();
        }
    };

    // Verify if it's a YouTube/Vimeo URL instead of a native video
    const isExternalUrl = url && (url.includes('youtube.com') || url.includes('youtu.be') || url.includes('vimeo.com'));

    if (isExternalUrl) {
        // Fallback to simple iframe for external URLs
        const embedUrl = url.includes('youtu.be')
            ? url.replace('youtu.be/', 'youtube.com/embed/')
            : url.replace('watch?v=', 'embed/');
        return (
            <iframe
                src={embedUrl}
                className="w-full h-full object-contain bg-black rounded-2xl"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
            ></iframe>
        )
    }

    return (
        <div
            ref={containerRef}
            className="w-full h-full bg-black relative group flex flex-col justify-center rounded-2xl overflow-hidden"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
        >
            <video
                ref={videoRef}
                src={url}
                poster={poster}
                onClick={togglePlay}
                className="w-full h-full object-contain bg-black cursor-pointer"
            />

            {/* Overlay Controls */}
            <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>

                {/* Progress Bar */}
                <div
                    className="w-full h-1.5 bg-white/30 rounded-full mb-4 cursor-pointer relative group/progress"
                    onClick={handleProgressBarClick}
                >
                    <div className="h-full bg-blue-500 rounded-full relative" style={{ width: `${progress}%` }}>
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full scale-0 group-hover/progress:scale-100 transition-transform"></div>
                    </div>
                </div>

                <div className="flex items-center justify-between text-white">
                    {/* Left Controls */}
                    <div className="flex items-center gap-4">
                        <button onClick={togglePlay} className="hover:text-blue-400 transition-colors focus:outline-none">
                            {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
                        </button>

                        <div className="flex items-center gap-1">
                            <button onClick={() => handleSkip(-10)} className="hover:text-blue-400 transition-colors tooltip focus:outline-none" title="-10s">
                                <Rewind size={20} />
                            </button>
                            <button onClick={() => handleSkip(10)} className="hover:text-blue-400 transition-colors focus:outline-none" title="+10s">
                                <FastForward size={20} />
                            </button>
                        </div>

                        <div className="flex items-center gap-2 group/volume relative">
                            <button onClick={toggleMute} className="hover:text-blue-400 transition-colors w-6 focus:outline-none">
                                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                            </button>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                value={volume}
                                onChange={handleVolumeChange}
                                className="w-0 opacity-0 group-hover/volume:w-20 group-hover/volume:opacity-100 transition-all duration-300 accent-blue-500 h-1.5"
                            />
                        </div>

                        <span className="text-xs font-medium text-gray-300 ml-2">
                            {currentTime} / {duration}
                        </span>
                    </div>

                    {/* Right Controls */}
                    <div className="flex items-center gap-4 relative">
                        <div className="relative">
                            <button
                                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                                className="text-xs font-bold hover:text-blue-400 transition-colors flex items-center focus:outline-none"
                            >
                                <Settings size={18} className="mr-1" /> {playbackRate}x
                            </button>

                            {/* Speed Menu Dropdown */}
                            {showSpeedMenu && (
                                <div className="absolute bottom-full right-0 mb-2 bg-gray-900 border border-white/10 rounded-lg shadow-xl overflow-hidden py-1 w-24">
                                    {[0.5, 1, 1.25, 1.5, 2].map((rate) => (
                                        <button
                                            key={rate}
                                            onClick={() => handleSpeedChange(rate)}
                                            className={`w-full text-left px-4 py-1.5 text-xs hover:bg-blue-600 transition-colors ${playbackRate === rate ? 'text-blue-400 font-bold' : 'text-gray-300'}`}
                                        >
                                            {rate}x
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <button onClick={toggleFullScreen} className="hover:text-blue-400 transition-colors focus:outline-none">
                            <Maximize size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Big Center Play Button (Overlay) - only shows when paused and mouse over */}
            {!isPlaying && (
                <div onClick={togglePlay} className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer pointer-events-auto">
                    <div className="bg-blue-600/90 text-white rounded-full p-4 transform hover:scale-110 transition-transform cursor-pointer shadow-[0_0_30px_rgba(37,99,235,0.5)]">
                        <Play size={40} fill="currentColor" />
                    </div>
                </div>
            )}
        </div>
    );
}

