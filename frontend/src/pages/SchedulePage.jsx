import { useState, useEffect, useRef } from 'react';
import { getTodaySchedule, regenerateSchedule, completeTask, missTask, skipTask, submitFeedback } from '../services/api';
import toast from 'react-hot-toast';
import { Calendar, RefreshCw, Clock, CheckCircle, XCircle, SkipForward, TrendingUp, Award, Zap, ChevronLeft, ChevronRight, Sparkles, Trophy, Brain } from 'lucide-react';

// Confetti Component
function Confetti({ active }) {
    const canvasRef = useRef(null);

    useEffect(() => {
        if (!active) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const particles = [];
        const colors = ['#00FFFF', '#FF00FF', '#00FF88', '#FFCC00', '#FF3366'];

        for (let i = 0; i < 150; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: -20,
                size: Math.random() * 6 + 3,
                speedY: Math.random() * 6 + 3,
                speedX: (Math.random() - 0.5) * 5,
                color: colors[Math.floor(Math.random() * colors.length)],
                rotation: Math.random() * 360,
                rotationSpeed: (Math.random() - 0.5) * 8,
            });
        }

        let animationId;
        let startTime = Date.now();

        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            let allDone = true;
            for (let p of particles) {
                if (p.y < canvas.height) {
                    allDone = false;
                    p.y += p.speedY;
                    p.x += p.speedX;
                    p.rotation += p.rotationSpeed;

                    ctx.save();
                    ctx.translate(p.x, p.y);
                    ctx.rotate(p.rotation * Math.PI / 180);
                    ctx.fillStyle = p.color;
                    ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
                    ctx.restore();
                }
            }

            if (!allDone && Date.now() - startTime < 2500) {
                animationId = requestAnimationFrame(animate);
            }
        }

        animate();

        return () => {
            if (animationId) cancelAnimationFrame(animationId);
        };
    }, [active]);

    if (!active) return null;
    return <canvas ref={canvasRef} className="confetti-canvas" />;
}

export default function SchedulePage() {
    const [schedule, setSchedule] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(null);
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);
    const [selectedAction, setSelectedAction] = useState(null);
    const [showConfetti, setShowConfetti] = useState(false);
    const [animateTaskId, setAnimateTaskId] = useState(null);
    const [feedbackData, setFeedbackData] = useState({
        actualDuration: '',
        fatigueAfter: 5,
        feedbackCodes: []
    });

    useEffect(() => {
        fetchSchedule();
    }, []);

    const fetchSchedule = async () => {
        setLoading(true);
        try {
            const data = await getTodaySchedule();
            setSchedule(data.schedule);
            if (data.schedule?.sessions?.length > 0 && !selectedDate) {
                const firstSession = data.schedule.sessions[0];
                if (firstSession.startTime) {
                    setSelectedDate(new Date(firstSession.startTime).toDateString());
                }
            }
        } catch (error) {
            console.error('Failed to fetch schedule:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRegenerate = async () => {
        toast.loading('Regenerating schedule...', { id: 'regenerate' });
        try {
            await regenerateSchedule();
            toast.success('Schedule regeneration started!', { id: 'regenerate' });
            setTimeout(fetchSchedule, 3000);
        } catch (error) {
            toast.error('Failed to regenerate', { id: 'regenerate' });
        }
    };

    const openFeedbackModal = (taskId, action) => {
        setSelectedTask({ _id: taskId, title: 'Loading...' });
        setSelectedAction(action);
        setFeedbackData({
            actualDuration: action === 'complete' ? '' : '0',
            fatigueAfter: 5,
            feedbackCodes: []
        });
        setShowFeedbackModal(true);
    };

    const handleFeedbackSubmit = async () => {
        if (selectedAction === 'complete' && !feedbackData.actualDuration) {
            toast.error('Please enter actual duration');
            return;
        }

        setAnimateTaskId(selectedTask._id);

        try {
            if (selectedAction === 'complete') {
                await completeTask(selectedTask._id, parseInt(feedbackData.actualDuration));
                toast.success('🎉 Task completed! Great job!');
                setShowConfetti(true);
                setTimeout(() => setShowConfetti(false), 2500);
            } else if (selectedAction === 'fail') {
                await missTask(selectedTask._id);
                toast.error('Task marked as failed. It will be rescheduled.');
            } else if (selectedAction === 'skip') {
                await skipTask(selectedTask._id);
                toast('Task skipped. It will appear in next schedule.');
            }

            if (feedbackData.feedbackCodes.length > 0 || selectedAction !== 'complete') {
                await submitFeedback({
                    taskId: selectedTask._id,
                    outcome: selectedAction === 'complete' ? 'completed' : selectedAction === 'fail' ? 'failed' : 'skipped',
                    actualDurationMin: selectedAction === 'complete' ? parseInt(feedbackData.actualDuration) : null,
                    fatigueAfter: feedbackData.fatigueAfter,
                    feedback: feedbackData.feedbackCodes,
                });
            }

            setTimeout(() => setAnimateTaskId(null), 500);
            setShowFeedbackModal(false);
            fetchSchedule();
        } catch (error) {
            console.error('Error:', error);
            toast.error('Failed to process task');
            setAnimateTaskId(null);
        }
    };

    const toggleFeedbackCode = (code) => {
        setFeedbackData(prev => ({
            ...prev,
            feedbackCodes: prev.feedbackCodes.includes(code)
                ? prev.feedbackCodes.filter(c => c !== code)
                : [...prev.feedbackCodes, code]
        }));
    };

    const formatTime = (isoString) => {
        if (!isoString) return 'TBD';
        return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatDateHeader = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const feedbackOptions = [
        { code: 'F1', label: 'Not enough time', description: 'Task took longer than scheduled' },
        { code: 'F2', label: 'Too tired', description: 'Couldn\'t focus due to fatigue' },
        { code: 'F3', label: 'Wrong time of day', description: 'This time didn\'t work for me' },
        { code: 'F4', label: 'Too difficult', description: 'Task was harder than expected' },
        { code: 'F5', label: 'Distracted', description: 'Couldn\'t maintain focus' },
        { code: 'F8', label: 'Bad context switch', description: 'Switching tasks was hard' },
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="relative">
                    <div className="w-12 h-12 border-2 border-[#00FFFF]/30 border-t-[#00FFFF] rounded-full animate-spin"></div>
                </div>
            </div>
        );
    }

    const sessions = schedule?.sessions || [];
    const sessionsByDate = {};
    sessions.forEach(session => {
        if (session.startTime) {
            const dateKey = new Date(session.startTime).toDateString();
            if (!sessionsByDate[dateKey]) sessionsByDate[dateKey] = [];
            sessionsByDate[dateKey].push(session);
        }
    });

    // Get actual dates that have sessions
    const sessionDates = Object.keys(sessionsByDate).sort((a, b) => new Date(a) - new Date(b));

    // Generate ALL dates between first and last session date
    let allDates = [];
    if (sessionDates.length > 0) {
        const firstDate = new Date(sessionDates[0]);
        const lastDate = new Date(sessionDates[sessionDates.length - 1]);
        const currentDate = new Date(firstDate);

        while (currentDate <= lastDate) {
            allDates.push(currentDate.toDateString());
            currentDate.setDate(currentDate.getDate() + 1);
        }
    }

    // Use allDates for display (shows empty days too)
    const dates = allDates.length > 0 ? allDates : sessionDates;

    if (dates.length > 0 && !selectedDate) {
        setSelectedDate(dates[0]);
    }

    const currentDateSessions = selectedDate ? sessionsByDate[selectedDate] || [] : [];
    const hasNoTasks = currentDateSessions.length === 0;
    const totalTasks = sessions.filter(s => s.taskId).length;
    const completedCount = sessions.filter(s => s.status === 'completed').length;
    const completionRate = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

    return (
        <>
            <Confetti active={showConfetti} />

            <div>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold gradient-text mb-1">Neon Schedule</h1>
                        <p className="text-[#888] flex items-center gap-2">
                            <Brain className="w-4 h-4 text-[#00FFFF]" />
                            AI-optimized multi-day schedule
                        </p>
                    </div>
                    <button onClick={handleRegenerate} className="btn-cyan flex items-center gap-2">
                        <RefreshCw className="w-4 h-4" />
                        Regenerate
                    </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="glass-card p-4 group hover:scale-105 transition-all">
                        <div className="flex items-center justify-between mb-2">
                            <Clock className="w-6 h-6 text-[#00FFFF] group-hover:animate-pulse-ring" />
                            <span className="text-2xl font-bold text-white">{totalTasks}</span>
                        </div>
                        <p className="text-[#888] text-sm">Total Tasks</p>
                    </div>
                    <div className="glass-card p-4 group hover:scale-105 transition-all">
                        <div className="flex items-center justify-between mb-2">
                            <CheckCircle className="w-6 h-6 text-[#00FF88] group-hover:animate-pulse-ring" />
                            <span className="text-2xl font-bold text-white">{completedCount}</span>
                        </div>
                        <p className="text-[#888] text-sm">Completed</p>
                    </div>
                    <div className="glass-card p-4 group hover:scale-105 transition-all">
                        <div className="flex items-center justify-between mb-2">
                            <TrendingUp className="w-6 h-6 text-[#FF00FF] group-hover:animate-pulse-ring" />
                            <span className="text-2xl font-bold text-white">{completionRate}%</span>
                        </div>
                        <p className="text-[#888] text-sm">Completion Rate</p>
                    </div>
                    <div className="glass-card p-4 group hover:scale-105 transition-all">
                        <div className="flex items-center justify-between mb-2">
                            <Award className="w-6 h-6 text-[#FFCC00] group-hover:animate-pulse-ring" />
                            <span className="text-2xl font-bold text-white">{sessions.filter(s => s.taskId?.difficulty === 2).length}</span>
                        </div>
                        <p className="text-[#888] text-sm">Hard Tasks</p>
                    </div>
                </div>

                {/* Date Selector - Shows ALL dates between first and last task */}
                {dates.length > 0 && (
                    <div className="glass-card p-4 mb-6">
                        <div className="flex items-center justify-between">
                            <button
                                onClick={() => {
                                    const currentIndex = dates.indexOf(selectedDate);
                                    if (currentIndex > 0) setSelectedDate(dates[currentIndex - 1]);
                                }}
                                disabled={dates.indexOf(selectedDate) === 0}
                                className="p-2 rounded-xl hover:bg-[#00FFFF]/10 disabled:opacity-30 transition-all"
                            >
                                <ChevronLeft className="w-5 h-5 text-[#00FFFF]" />
                            </button>

                            <div className="flex gap-2 overflow-x-auto px-2">
                                {dates.map((date) => {
                                    const dateObj = new Date(date);
                                    const isSelected = selectedDate === date;
                                    const hasTasks = sessionsByDate[date]?.length > 0;
                                    return (
                                        <button
                                            key={date}
                                            onClick={() => setSelectedDate(date)}
                                            className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap ${isSelected
                                                    ? 'bg-gradient-to-r from-[#00FFFF] to-[#FF00FF] text-[#0A0A0F] font-bold shadow-[0_0_15px_#00FFFF]'
                                                    : hasTasks
                                                        ? 'bg-[#1A1A2E] text-[#00FFFF] border border-[#00FFFF]/30 hover:border-[#00FFFF]'
                                                        : 'bg-[#1A1A2E]/50 text-[#555] border border-[#00FFFF]/10'
                                                }`}
                                        >
                                            <div className="text-sm font-medium">
                                                {dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                            </div>
                                            <div className="text-xs opacity-70">
                                                {dateObj.toLocaleDateString('en-US', { weekday: 'short' })}
                                            </div>
                                            {hasTasks && (
                                                <div className="w-1.5 h-1.5 bg-[#00FFFF] rounded-full mx-auto mt-1"></div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>

                            <button
                                onClick={() => {
                                    const currentIndex = dates.indexOf(selectedDate);
                                    if (currentIndex < dates.length - 1) setSelectedDate(dates[currentIndex + 1]);
                                }}
                                disabled={dates.indexOf(selectedDate) === dates.length - 1}
                                className="p-2 rounded-xl hover:bg-[#00FFFF]/10 disabled:opacity-30 transition-all"
                            >
                                <ChevronRight className="w-5 h-5 text-[#00FFFF]" />
                            </button>
                        </div>
                    </div>
                )}

                {dates.length === 0 ? (
                    <div className="glass-card p-12 text-center">
                        <div className="w-20 h-20 bg-[#1A1A2E] rounded-full flex items-center justify-center mx-auto mb-4">
                            <Brain className="w-10 h-10 text-[#00FFFF] animate-float" />
                        </div>
                        <h3 className="text-xl font-semibold text-white mb-2">No Schedule Yet</h3>
                        <p className="text-[#888] mb-6">Create a goal to generate your personalized schedule</p>
                        <a href="/goal" className="btn-cyan inline-flex items-center gap-2">
                            <Sparkles className="w-4 h-4" />
                            Create Goal
                        </a>
                    </div>
                ) : (
                    <>
                        <div className="mb-4 pb-2 border-b border-[#00FFFF]/20">
                            <h2 className="text-xl font-semibold gradient-text">
                                {formatDateHeader(selectedDate)}
                            </h2>
                            <p className="text-[#888] text-sm mt-1">
                                {hasNoTasks ? 'No tasks scheduled' : `${currentDateSessions.length} tasks scheduled`}
                            </p>
                        </div>

                        {hasNoTasks ? (
                            <div className="glass-card p-8 text-center">
                                <p className="text-[#888]">📭 No tasks scheduled for this day</p>
                                <p className="text-[#555] text-sm mt-2">Enjoy your free time!</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {currentDateSessions.map((session) => {
                                    const isTask = !!session.taskId;
                                    const status = session.status;
                                    const isCompleted = status === 'completed';
                                    const isFailed = status === 'failed';
                                    const isSkipped = status === 'skipped';
                                    const isAnimating = animateTaskId === session.taskId?._id;

                                    return (
                                        <div
                                            key={session._id}
                                            className={`glass-card p-4 transition-all duration-300 ${isAnimating ? 'bg-[#00FF88]/10 border-[#00FF88]' : ''
                                                } ${isCompleted ? 'border-l-4 border-l-[#00FF88]' : isFailed ? 'border-l-4 border-l-[#FF3366]' : ''}`}
                                        >
                                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                        {isTask ? (
                                                            <>
                                                                <span className={`font-semibold text-white ${isCompleted ? 'line-through opacity-70' : ''}`}>
                                                                    {session.taskId?.title}
                                                                </span>
                                                                {session.taskId?.difficulty === 2 && (
                                                                    <span className="badge-hard">🔥 Hard</span>
                                                                )}
                                                                {session.taskId?.difficulty === 1 && (
                                                                    <span className="badge-medium">📘 Medium</span>
                                                                )}
                                                                {session.taskId?.difficulty === 0 && (
                                                                    <span className="badge-easy">📗 Easy</span>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <span className="font-semibold text-white flex items-center gap-2">
                                                                <Zap className="w-4 h-4 text-[#FFCC00]" />
                                                                Break Time
                                                            </span>
                                                        )}
                                                        {isCompleted && <span className="badge-completed">✓ Completed</span>}
                                                        {isFailed && <span className="badge-failed">✗ Failed</span>}
                                                        {isSkipped && <span className="badge-pending">⏭ Skipped</span>}
                                                    </div>

                                                    <div className="flex flex-wrap gap-4 text-sm text-[#888]">
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            {formatTime(session.startTime)} - {formatTime(session.endTime)}
                                                        </span>
                                                        {isTask && (
                                                            <>
                                                                <span>📊 {session.scheduledDurationMin} min</span>
                                                                <span>📚 {session.taskId?.taskType}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>

                                                {isTask && !isCompleted && !isFailed && !isSkipped && (
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => openFeedbackModal(session.taskId._id, 'complete')}
                                                            className="btn-green text-sm px-3 py-1.5 flex items-center gap-1"
                                                        >
                                                            <CheckCircle className="w-4 h-4" />
                                                            Complete
                                                        </button>
                                                        <button
                                                            onClick={() => openFeedbackModal(session.taskId._id, 'fail')}
                                                            className="btn-red text-sm px-3 py-1.5 flex items-center gap-1"
                                                        >
                                                            <XCircle className="w-4 h-4" />
                                                            Fail
                                                        </button>
                                                        <button
                                                            onClick={() => openFeedbackModal(session.taskId._id, 'skip')}
                                                            className="btn-yellow text-sm px-3 py-1.5 flex items-center gap-1"
                                                        >
                                                            <SkipForward className="w-4 h-4" />
                                                            Skip
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}

                {/* Feedback Modal */}
                {showFeedbackModal && selectedTask && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
                        <div className="glass-card max-w-md w-full p-6 animate-slideIn">
                            <div className="flex items-center gap-3 mb-6">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${selectedAction === 'complete' ? 'bg-[#00FF88]/20' : selectedAction === 'fail' ? 'bg-[#FF3366]/20' : 'bg-[#FFCC00]/20'
                                    }`}>
                                    {selectedAction === 'complete' ? <Trophy className="w-6 h-6 text-[#00FF88]" /> : selectedAction === 'fail' ? <XCircle className="w-6 h-6 text-[#FF3366]" /> : <SkipForward className="w-6 h-6 text-[#FFCC00]" />}
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white">{selectedAction === 'complete' ? 'Complete Task' : selectedAction === 'fail' ? 'Task Failed' : 'Skip Task'}</h2>
                                    <p className="text-[#888] text-sm">{selectedTask.title === 'Loading...' ? 'Task' : selectedTask.title}</p>
                                </div>
                            </div>

                            {selectedAction === 'complete' && (
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-[#AAA] mb-2">Actual Duration (minutes)</label>
                                    <input
                                        type="number"
                                        value={feedbackData.actualDuration}
                                        onChange={(e) => setFeedbackData({ ...feedbackData, actualDuration: e.target.value })}
                                        className="input-neon"
                                        placeholder="e.g., 45"
                                    />
                                </div>
                            )}

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-[#AAA] mb-2">Fatigue Level</label>
                                <div className="flex gap-2 flex-wrap">
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(level => (
                                        <button
                                            key={level}
                                            type="button"
                                            onClick={() => setFeedbackData({ ...feedbackData, fatigueAfter: level })}
                                            className={`w-9 h-9 rounded-xl font-medium transition-all ${feedbackData.fatigueAfter === level
                                                ? 'bg-gradient-to-r from-[#00FFFF] to-[#FF00FF] text-[#0A0A0F] shadow-[0_0_10px_#00FFFF]'
                                                : 'bg-[#1A1A2E] text-[#AAA] hover:border-[#00FFFF]/50 border border-[#00FFFF]/20'
                                                }`}
                                        >
                                            {level}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-xs text-[#666] mt-2">1 = Energetic, 10 = Exhausted</p>
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium text-[#AAA] mb-3">What happened?</label>
                                <div className="space-y-2">
                                    {feedbackOptions.map(option => (
                                        <label
                                            key={option.code}
                                            className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${feedbackData.feedbackCodes.includes(option.code)
                                                ? 'border-[#00FFFF] bg-[#00FFFF]/10'
                                                : 'border-[#00FFFF]/20 hover:border-[#00FFFF]/50'
                                                }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={feedbackData.feedbackCodes.includes(option.code)}
                                                onChange={() => toggleFeedbackCode(option.code)}
                                                className="mt-0.5 accent-[#00FFFF]"
                                            />
                                            <div>
                                                <div className="font-medium text-white text-sm">{option.code} — {option.label}</div>
                                                <div className="text-xs text-[#888]">{option.description}</div>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button onClick={handleFeedbackSubmit} className="flex-1 btn-cyan">
                                    Submit
                                </button>
                                <button onClick={() => setShowFeedbackModal(false)} className="flex-1 btn-outline">
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}