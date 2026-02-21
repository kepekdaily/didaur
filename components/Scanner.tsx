
import React, { useState, useRef, useEffect } from 'react';
import Cropper from 'react-easy-crop';
import { analyzeImage, generateDIYImage, generateStepImage } from '../services/geminiService';
import { RecyclingRecommendation, UserProfile, DIYIdea } from '../types';
import { updateUserPoints, saveScanToHistory, getScanHistory, saveCommunityPost } from '../utils/storage';

const getCroppedImg = async (imageSrc: string, pixelCrop: any): Promise<string> => {
  const image = new Image();
  image.src = imageSrc;
  await new Promise((resolve) => (image.onload = resolve));
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height);
  return canvas.toDataURL('image/jpeg', 0.8);
};

interface ScannerProps {
  user: UserProfile;
  onPointsUpdate: (updatedUser: UserProfile) => void;
  isDarkMode: boolean;
}

const Scanner: React.FC<ScannerProps> = ({ user, onPointsUpdate, isDarkMode }) => {
  const [image, setImage] = useState<string | null>(null);
  const [tempImage, setTempImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [result, setResult] = useState<RecyclingRecommendation | null>(null);
  const [activeTab, setActiveTab] = useState<'Scan' | 'Riwayat'>('Scan');
  const [history, setHistory] = useState<RecyclingRecommendation[]>(getScanHistory());
  const [isCropping, setIsCropping] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  
  const [ideaImages, setIdeaImages] = useState<Record<number, string>>({});
  const [stepImages, setStepImages] = useState<Record<string, string>>({});
  const [loadingStepImage, setLoadingStepImage] = useState<string | null>(null);
  const [selectedTutorial, setSelectedTutorial] = useState<DIYIdea | null>(null);
  const [currentStep, setCurrentStep] = useState<number>(0); 
  const [completionPhoto, setCompletionPhoto] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isCompletionCameraActive, setIsCompletionCameraActive] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const completionVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
    setIsCompletionCameraActive(false);
  };

  const startCamera = async (isCompletion = false) => {
    stopCamera();
    try {
      const constraints = { 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }, 
        audio: false 
      };

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (e) {
        console.warn("Failed with environment facingMode, trying default", e);
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
      
      streamRef.current = stream;

      if (isCompletion) {
        setIsCompletionCameraActive(true);
      } else {
        setIsCameraActive(true);
      }
    } catch (err: any) {
      console.error("Camera access error:", err);
      alert("Gagal mengakses kamera. Pastikan Anda telah memberikan izin kamera di browser Anda.");
    }
  };

  useEffect(() => {
    if (isCameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [isCameraActive]);

  useEffect(() => {
    if (isCompletionCameraActive && completionVideoRef.current && streamRef.current) {
      completionVideoRef.current.srcObject = streamRef.current;
    }
  }, [isCompletionCameraActive]);

  const handleCapture = (isCompletion = false) => {
    const targetVideo = isCompletion ? completionVideoRef.current : videoRef.current;
    console.log("Attempting capture. Target video:", targetVideo);
    
    if (targetVideo && canvasRef.current) {
      if (targetVideo.videoWidth === 0 || targetVideo.videoHeight === 0) {
        console.warn("Video dimensions are 0. Video might not be ready.");
        return;
      }
      
      const canvas = canvasRef.current;
      canvas.width = targetVideo.videoWidth;
      canvas.height = targetVideo.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(targetVideo, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        if (isCompletion) {
          console.log("Completion photo captured");
          setCompletionPhoto(dataUrl);
          stopCamera();
        } else {
          console.log("Scan photo captured");
          setTempImage(dataUrl);
          setIsCropping(true);
          stopCamera();
        }
      }
    } else {
      console.error("Capture failed: targetVideo or canvasRef is null", { targetVideo, canvas: canvasRef.current });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setTempImage(dataUrl);
        setIsCropping(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropConfirm = async () => {
    if (!tempImage || !croppedAreaPixels) return;
    setLoading(true);
    setScanError(null);
    setIsCropping(false);
    setIdeaImages({});
    setResult(null);

    try {
      const croppedBase64 = await getCroppedImg(tempImage, croppedAreaPixels);
      setImage(croppedBase64);
      
      const data = await analyzeImage(croppedBase64.split(',')[1]);
      const finalData = { ...data, originalImage: croppedBase64, timestamp: Date.now() };
      setResult(finalData);
      saveScanToHistory(finalData);
      setHistory(getScanHistory());
      
      const updatedUser = await updateUserPoints(20, data.co2Impact, true);
      if (updatedUser) onPointsUpdate(updatedUser);

      finalData.diyIdeas.forEach(async (idea, idx) => {
        try {
          const imgUrl = await generateDIYImage(idea.title, finalData.itemName, idea.imagePrompt);
          setIdeaImages(prev => ({ ...prev, [idx]: imgUrl }));
          updateHistoryItemImage(finalData.timestamp!, idx, imgUrl);
        } catch (e) {}
      });

    } catch (error: any) {
      setScanError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const updateHistoryItemImage = (timestamp: number, ideaIdx: number, imageUrl: string) => {
    const currentHistory = getScanHistory();
    const itemIdx = currentHistory.findIndex(h => h.timestamp === timestamp);
    if (itemIdx !== -1) {
      currentHistory[itemIdx].diyIdeas[ideaIdx].imageUrl = imageUrl;
      localStorage.setItem('didaur_history_v5', JSON.stringify(currentHistory));
      setHistory(currentHistory);
    }
  };

  const handleGenerateStepImage = async (step: string, title: string) => {
    const key = `${title}-${step}`;
    if (stepImages[key]) return;
    
    setLoadingStepImage(key);
    try {
      const imgUrl = await generateStepImage(step, title);
      setStepImages(prev => ({ ...prev, [key]: imgUrl }));
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingStepImage(null);
    }
  };
  const handleFinishTutorial = async () => {
    if (!selectedTutorial || !completionPhoto) return;
    setLoading(true);
    try {
      await saveCommunityPost({
        userName: user.name,
        userAvatar: user.avatar,
        itemName: selectedTutorial.title,
        description: `Baru saja menyelesaikan proyek DIY: ${selectedTutorial.title}! #DidaurAI`,
        imageUrl: completionPhoto,
        materialTag: result?.materialType || 'Lainnya',
        isForSale: false
      });
      const updatedUser = await updateUserPoints(250, 0, false);
      if (updatedUser) onPointsUpdate(updatedUser);
      setSelectedTutorial(null);
      setCompletionPhoto(null);
      setCurrentStep(0);
      alert("Bagus! Poin XP ditambahkan dan karya dibagikan!");
    } catch (error) {
      alert("Gagal menyimpan progress.");
    } finally {
      setLoading(false);
    }
  };

  const resetScan = () => {
    setImage(null);
    setResult(null);
    setScanError(null);
    setTempImage(null);
    setIsCropping(false);
    stopCamera();
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  return (
    <div className="flex flex-col space-y-4 p-4 animate-in fade-in duration-500 min-h-screen">
      <div className="flex bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl w-max mx-auto mb-4 shadow-inner">
         {['Scan', 'Riwayat'].map(t => (
           <button key={t} onClick={() => { setActiveTab(t as any); if(t === 'Riwayat') { setHistory(getScanHistory()); resetScan(); } }} className={`px-8 py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === t ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm' : 'text-slate-400 dark:text-slate-600'}`}>{t}</button>
         ))}
      </div>

      {activeTab === 'Scan' ? (
        <>
          {!isCameraActive && !image && !isCropping ? (
            <div className="space-y-8 pt-10 text-center flex flex-col items-center">
              <div className="px-8">
                <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">Mulai Daur Ulang</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-4 font-medium text-sm">Ambil foto barang bekas Anda untuk dianalisis oleh AI.</p>
              </div>
              <div className="grid grid-cols-2 gap-6 w-full max-w-sm">
                <div onClick={() => startCamera()} className="aspect-square cursor-pointer group">
                  <div className="h-full border-2 border-green-100 dark:border-green-800 rounded-[2.5rem] bg-white dark:bg-slate-900 flex flex-col items-center justify-center p-4 shadow-sm group-hover:scale-105 transition-all">
                    <div className="w-14 h-14 bg-green-600 rounded-2xl flex items-center justify-center shadow-lg mb-3 text-white">
                      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </div>
                    <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Kamera</span>
                  </div>
                </div>
                <div onClick={() => fileInputRef.current?.click()} className="aspect-square cursor-pointer group">
                  <div className="h-full border-2 border-blue-100 dark:border-blue-800 rounded-[2.5rem] bg-white dark:bg-slate-900 flex flex-col items-center justify-center p-4 shadow-sm group-hover:scale-105 transition-all">
                    <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg mb-3 text-white">
                      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2-2v12a2 2 0 002 2z" /></svg>
                    </div>
                    <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Galeri</span>
                  </div>
                </div>
              </div>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
            </div>
          ) : isCameraActive ? (
            <div className="relative flex flex-col h-[75vh] animate-in fade-in zoom-in duration-300">
               <div className="relative flex-1 rounded-[3rem] overflow-hidden border-4 border-white dark:border-slate-800 shadow-2xl bg-black">
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                  <button onClick={stopCamera} className="absolute top-6 left-6 p-4 bg-white/10 backdrop-blur-md rounded-2xl text-white border border-white/20">✕ Batal</button>
               </div>
               <div className="p-8 flex items-center justify-center">
                  <button onClick={() => handleCapture()} className="w-24 h-24 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-2xl border-8 border-green-600 active:scale-90 transition-transform">
                    <div className="w-14 h-14 bg-green-600 rounded-full"></div>
                  </button>
               </div>
            </div>
          ) : isCropping ? (
            <div className="fixed inset-0 z-[500] bg-slate-950 flex flex-col">
              <div className="relative flex-1 bg-black"><Cropper image={tempImage!} crop={crop} zoom={zoom} aspect={1} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={(_c, p) => setCroppedAreaPixels(p)} /></div>
              <div className="p-10 bg-slate-950/90 backdrop-blur-md z-10 flex flex-col space-y-4">
                <button onClick={handleCropConfirm} className="w-full bg-green-600 text-white py-5 rounded-[2.5rem] font-black shadow-xl tracking-widest uppercase text-sm">ANALISIS DENGAN AI</button>
                <button onClick={() => setIsCropping(false)} className="w-full py-4 text-slate-400 font-bold uppercase text-xs tracking-widest">Kembali</button>
              </div>
            </div>
          ) : (
            <div className="space-y-6 pb-20 max-w-md mx-auto w-full">
              <div className="relative rounded-[3rem] overflow-hidden shadow-2xl border-4 border-white dark:border-slate-800">
                <img src={image!} className="w-full aspect-square object-cover" />
                {loading && (
                  <div className="absolute inset-0 bg-black/80 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center text-white">
                     <div className="w-20 h-20 border-4 border-white/20 border-t-green-500 rounded-full animate-spin mb-6"></div>
                     <h2 className="text-xl font-black mb-2">Sedang Menganalisis...</h2>
                     <p className="text-[10px] font-bold text-slate-400 px-6">AI Didaur sedang mengidentifikasi material dan mencari ide terbaik untuk Anda.</p>
                  </div>
                )}
                {scanError && (
                  <div className="absolute inset-0 bg-rose-950/90 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center text-white animate-in zoom-in">
                     <div className="text-5xl mb-4">⚠️</div>
                     <h2 className="text-xl font-black mb-2">Gagal Menganalisis</h2>
                     <p className="text-xs font-bold text-rose-200 px-4 mb-6">{scanError}</p>
                     <div className="flex flex-col w-full space-y-3">
                        <button onClick={handleCropConfirm} className="w-full bg-white text-rose-900 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest">Coba Lagi</button>
                        <button onClick={resetScan} className="w-full bg-rose-800/50 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest">Pilih Barang Lain</button>
                     </div>
                  </div>
                )}
              </div>

              {result && !loading && (
                <div className="space-y-10 animate-in slide-in-from-bottom-8 duration-700">
                  <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 border border-slate-100 dark:border-slate-800 shadow-sm">
                    <h2 className="text-3xl font-black text-slate-800 dark:text-white leading-tight">{result.itemName}</h2>
                    <div className="flex items-center space-x-3 mt-3">
                       <span className="text-[10px] font-black text-green-600 bg-green-50 dark:bg-green-950 px-3 py-1 rounded-full uppercase tracking-widest">{result.materialType}</span>
                       <span className="text-[10px] font-black text-amber-600 bg-amber-50 dark:bg-amber-950 px-3 py-1 rounded-full uppercase tracking-widest">{result.difficulty}</span>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-2xl font-black text-slate-800 dark:text-white px-2">Rekomendasi Daur Ulang</h3>
                    <div className="grid gap-6">
                      {result.diyIdeas.map((idea, idx) => (
                        <div key={idx} className="bg-white dark:bg-slate-900 rounded-[3rem] p-6 border border-slate-100 dark:border-slate-800 space-y-5 shadow-sm group">
                          <div className="relative overflow-hidden rounded-[2rem] aspect-[16/10] bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                             {ideaImages[idx] ? (
                               <img src={ideaImages[idx]} loading="lazy" className="w-full h-full object-cover animate-in fade-in duration-1000" />
                             ) : (
                               <div className="flex flex-col items-center space-y-2 opacity-40">
                                 <div className="w-8 h-8 border-2 border-slate-400 border-t-green-500 rounded-full animate-spin"></div>
                                 <span className="text-[8px] font-black uppercase tracking-widest">Generasi Visual AI...</span>
                               </div>
                             )}
                          </div>
                          <div>
                            <h4 className="text-xl font-black text-slate-900 dark:text-white">{idea.title}</h4>
                            <p className="text-sm text-slate-500 mt-2 line-clamp-2 leading-relaxed font-medium italic">"{idea.description}"</p>
                          </div>
                          <button 
                            onClick={() => { setSelectedTutorial({ ...idea, imageUrl: ideaImages[idx] }); setCurrentStep(-1); }}
                            className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-5 rounded-[2rem] font-black text-[10px] uppercase tracking-[0.2em] shadow-lg active:scale-95 transition-all"
                          >
                            LIHAT TUTORIAL
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="pt-4 flex flex-col items-center space-y-6">
                     <button 
                      onClick={resetScan}
                      className="w-full bg-green-600 text-white py-6 rounded-[2.5rem] font-black text-sm uppercase tracking-widest shadow-xl active:scale-95 transition-all"
                     >
                       SCAN BARANG LAIN
                     </button>
                     <button onClick={() => setActiveTab('Riwayat')} className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Lihat Riwayat</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="space-y-4 pb-24 max-w-md mx-auto w-full">
           <h2 className="text-xl font-black px-4 dark:text-white">Riwayat Terakhir</h2>
           {history.length > 0 ? history.map((item, idx) => (
             <div key={idx} onClick={() => { setResult(item); setImage(item.originalImage || null); setActiveTab('Scan'); }} className="bg-white dark:bg-slate-900 p-4 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 flex items-center space-x-5 cursor-pointer active:scale-95 transition-all shadow-sm">
                <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-2xl overflow-hidden">
                   {item.originalImage ? (
                     <img src={item.originalImage} loading="lazy" className="w-full h-full object-cover" />
                   ) : (
                     <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>
                   )}
                </div>
                <div className="flex-1">
                   <h4 className="font-black text-slate-800 dark:text-slate-100 line-clamp-1">{item.itemName}</h4>
                   <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{item.materialType}</p>
                   <p className="text-[8px] text-slate-300 font-bold mt-1">
                     {item.timestamp ? new Date(item.timestamp).toLocaleDateString('id-ID') : 'Baru saja'}
                   </p>
                </div>
                <div className="text-green-600 font-black px-2">+{item.estimatedPoints}</div>
             </div>
           )) : (
             <div className="text-center py-24 space-y-4 opacity-30 grayscale">
                <span className="text-6xl">♻️</span>
                <p className="text-slate-500 font-black text-xs uppercase tracking-widest">Riwayat Masih Kosong</p>
             </div>
           )}
        </div>
      )}

      {selectedTutorial && (
        <div className="fixed inset-0 z-[600] bg-white dark:bg-slate-950 flex flex-col animate-in slide-in-from-right duration-500">
           <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <button onClick={() => { stopCamera(); setSelectedTutorial(null); }} className="text-slate-400 font-bold">✕ Tutup</button>
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Proyek Daur Ulang</h4>
              <div className="w-10"></div>
           </div>
           <div className="flex-1 p-8 overflow-y-auto no-scrollbar">
              <h2 className="text-3xl font-black mb-6 leading-tight dark:text-white">{selectedTutorial.title}</h2>
              {currentStep === -1 ? (
                <div className="space-y-8">
                   <div className="rounded-[2.5rem] overflow-hidden aspect-video shadow-2xl">
                      <img src={selectedTutorial.imageUrl || `https://picsum.photos/seed/${selectedTutorial.title}/600/400`} loading="lazy" className="w-full h-full object-cover" />
                   </div>
                   <div className="space-y-4">
                      <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-widest text-[10px]">Alat & Bahan:</h3>
                      <div className="grid gap-2">
                        {selectedTutorial.toolsNeeded.map((t, i) => (
                          <div key={i} className="p-5 bg-slate-50 dark:bg-slate-900 rounded-2xl font-bold flex items-center space-x-4 border border-slate-100 dark:border-slate-800">
                            <span className="text-lg">🛠️</span>
                            <span className="text-sm dark:text-slate-300">{t}</span>
                          </div>
                        ))}
                      </div>
                   </div>
                   <button onClick={() => setCurrentStep(0)} className="w-full bg-green-600 text-white py-6 rounded-[2.5rem] font-black shadow-xl uppercase tracking-widest text-sm active:scale-95 transition-all">MULAI TUTORIAL</button>
                </div>
              ) : currentStep < selectedTutorial.steps.length ? (
                <div key={currentStep} className="h-full flex flex-col items-center justify-center animate-in slide-in-from-right duration-500 space-y-10 py-10">
                   <div className="w-24 h-24 bg-green-600 text-white rounded-[2rem] flex flex-col items-center justify-center shadow-2xl">
                      <span className="text-[10px] font-black opacity-60 uppercase">Tahap</span>
                      <span className="text-4xl font-black">{currentStep + 1}</span>
                   </div>
                   <div className="p-8 bg-slate-50 dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 w-full min-h-[200px] flex flex-col items-center justify-center shadow-inner space-y-4">
                      <p className="text-xl font-black text-center leading-relaxed text-slate-900 dark:text-white px-2">
                        {selectedTutorial.steps[currentStep]}
                      </p>
                      
                      {stepImages[`${selectedTutorial.title}-${selectedTutorial.steps[currentStep]}`] ? (
                        <div className="w-full aspect-video rounded-2xl overflow-hidden shadow-lg animate-in zoom-in">
                          <img src={stepImages[`${selectedTutorial.title}-${selectedTutorial.steps[currentStep]}`]} loading="lazy" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <button 
                          onClick={() => handleGenerateStepImage(selectedTutorial!.steps[currentStep], selectedTutorial!.title)}
                          disabled={loadingStepImage === `${selectedTutorial.title}-${selectedTutorial.steps[currentStep]}`}
                          className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest text-green-600 bg-green-50 dark:bg-green-950/30 px-4 py-2 rounded-full hover:bg-green-100 transition-colors"
                        >
                          {loadingStepImage === `${selectedTutorial.title}-${selectedTutorial.steps[currentStep]}` ? (
                            <>
                              <div className="w-3 h-3 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                              <span>Menyiapkan Visual...</span>
                            </>
                          ) : (
                            <>
                              <span>✨ Lihat Visualisasi Tahap Ini</span>
                            </>
                          )}
                        </button>
                      )}
                   </div>
                   <div className="flex w-full space-x-4">
                      <button onClick={() => setCurrentStep(prev => prev - 1)} className="flex-1 bg-slate-100 dark:bg-slate-800 py-5 rounded-2xl font-black text-slate-400 text-xs uppercase tracking-widest">Kembali</button>
                      <button onClick={() => setCurrentStep(prev => prev + 1)} className="flex-[2] bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-5 rounded-2xl font-black shadow-lg text-xs uppercase tracking-widest">Lanjutkan</button>
                   </div>
                </div>
              ) : (
                <div className="text-center space-y-10 py-10 animate-in zoom-in duration-500">
                   <div className="text-7xl">🌟</div>
                   <div className="space-y-3">
                      <h3 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">Luar Biasa!</h3>
                      <p className="text-slate-500 font-bold px-4">Karya Anda hampir selesai. Ambil foto hasilnya untuk mendapatkan bonus 250 XP!</p>
                   </div>
                   
                   {!completionPhoto ? (
                     <div className="space-y-6">
                        <div className="relative aspect-square rounded-[3rem] overflow-hidden bg-black border-4 border-white dark:border-slate-800 shadow-2xl">
                           {isCompletionCameraActive ? (
                             <video ref={completionVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                           ) : (
                             <div className="w-full h-full flex items-center justify-center text-slate-700 bg-slate-100 dark:bg-slate-800">
                               <span className="text-5xl">📷</span>
                             </div>
                           )}
                        </div>
                        {isCompletionCameraActive ? (
                           <button onClick={() => handleCapture(true)} className="w-24 h-24 bg-white border-8 border-green-600 rounded-full shadow-2xl mx-auto active:scale-90 transition-all"></button>
                        ) : (
                           <button onClick={() => startCamera(true)} className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-6 rounded-[2.5rem] font-black uppercase tracking-widest text-xs shadow-xl">BUKA KAMERA VERIFIKASI</button>
                        )}
                     </div>
                   ) : (
                     <div className="space-y-6">
                        <img src={completionPhoto} className="w-full aspect-square object-cover rounded-[3rem] shadow-2xl border-8 border-green-500/20" />
                        <button onClick={handleFinishTutorial} className="w-full bg-green-600 text-white py-6 rounded-[2.5rem] font-black shadow-xl uppercase tracking-widest text-sm active:scale-95 transition-all">KLAIM HADIAH & SELESAI</button>
                        <button onClick={() => { setCompletionPhoto(null); startCamera(true); }} className="text-slate-400 font-black uppercase text-[10px] tracking-widest">Ulangi Foto</button>
                     </div>
                   )}
                </div>
              )}
           </div>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default Scanner;
