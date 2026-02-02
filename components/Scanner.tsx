
import { useState, useRef, useEffect } from 'react';
import Cropper from 'react-easy-crop';
import { analyzeImage } from '../services/geminiService';
import { RecyclingRecommendation, UserProfile, CommunityPost, DIYIdea } from '../types';
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
  return canvas.toDataURL('image/jpeg');
};

interface ScannerProps {
  onPointsUpdate: (updatedUser: UserProfile) => void;
  isDarkMode: boolean;
}

const Scanner: React.FC<ScannerProps> = ({ onPointsUpdate, isDarkMode }) => {
  const [image, setImage] = useState<string | null>(null);
  const [tempImage, setTempImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RecyclingRecommendation | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [activeTab, setActiveTab] = useState<'Scan' | 'Riwayat'>('Scan');
  const [history, setHistory] = useState<RecyclingRecommendation[]>(getScanHistory());
  const [isCropping, setIsCropping] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [selectedTutorial, setSelectedTutorial] = useState<DIYIdea | null>(null);
  const [currentStep, setCurrentStep] = useState<number>(0); 
  const [completionPhoto, setCompletionPhoto] = useState<string | null>(null);
  const [isCompletionCameraActive, setIsCompletionCameraActive] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const completionVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async (isCompletion = false) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      if (isCompletion) {
        if (completionVideoRef.current) {
          completionVideoRef.current.srcObject = stream;
          streamRef.current = stream;
          setIsCompletionCameraActive(true);
        }
      } else if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsCameraActive(true);
      }
    } catch (err) {
      alert("Izin kamera diperlukan.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
    setIsCompletionCameraActive(false);
  };

  const handleCapture = (isCompletion = false) => {
    const targetVideo = isCompletion ? completionVideoRef.current : videoRef.current;
    if (targetVideo && canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width = targetVideo.videoWidth;
      canvas.height = targetVideo.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(targetVideo, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        if (isCompletion) {
          setCompletionPhoto(dataUrl);
          stopCamera();
        } else {
          setTempImage(dataUrl);
          setIsCropping(true);
          stopCamera();
        }
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setTempImage(reader.result as string);
        setIsCropping(true);
        stopCamera();
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropConfirm = async () => {
    if (!tempImage || !croppedAreaPixels) return;
    setLoading(true);
    setIsCropping(false);
    
    // Timeout Guard: Vercel Free memiliki limit 10s. Kita set 15s di client.
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Timeout: Proses analisis terlalu lama. Silakan coba lagi.")), 15000)
    );

    try {
      const croppedBase64 = await getCroppedImg(tempImage, croppedAreaPixels);
      setImage(croppedBase64);
      
      // Gunakan Promise.race untuk mencegah stuck loading selamanya
      const data = await Promise.race([
        analyzeImage(croppedBase64.split(',')[1]),
        timeoutPromise
      ]) as RecyclingRecommendation;
      
      setResult(data);
      saveScanToHistory(data);
      setHistory(getScanHistory());
      
      const updatedUser: UserProfile | null = await updateUserPoints(20, data.co2Impact, true);
      if (updatedUser) onPointsUpdate(updatedUser);
    } catch (error: any) {
      console.error("Scanner Error:", error);
      alert(error.message || "Gagal memproses gambar.");
      setResult(null);
      setImage(null);
    } finally {
      setLoading(false);
    }
  };

  const handleFinishTutorial = async () => {
    if (!completionPhoto || !selectedTutorial || !result) return;
    const updatedUser: UserProfile | null = await updateUserPoints(250, 0, false);
    if (updatedUser) {
      onPointsUpdate(updatedUser);
      const post: Partial<CommunityPost> = {
        userName: updatedUser.name,
        userAvatar: updatedUser.avatar,
        itemName: `Berhasil DIY: ${selectedTutorial.title}`,
        description: `Proyek ini berhasil saya selesaikan dari bahan ${result.itemName}!`,
        imageUrl: completionPhoto,
        timestamp: Date.now(),
        pointsEarned: 250,
        materialTag: result.materialType
      };
      await saveCommunityPost(post);
      alert("🎉 Proyek selesai! +250 XP didapatkan!");
      setSelectedTutorial(null);
      setCompletionPhoto(null);
      setCurrentStep(0);
    }
  };

  useEffect(() => { return () => stopCamera(); }, []);

  return (
    <div className="flex flex-col space-y-4 p-4 animate-in fade-in duration-500 min-h-screen">
      <div className="flex bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl w-max mx-auto mb-4 shadow-inner">
         {['Scan', 'Riwayat'].map(t => (
           <button key={t} onClick={() => setActiveTab(t as any)} className={`px-8 py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === t ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm' : 'text-slate-400 dark:text-slate-600'}`}>{t}</button>
         ))}
      </div>

      {activeTab === 'Scan' ? (
        <>
          {!isCameraActive && !image && !isCropping ? (
            <div className="space-y-8 pt-10 text-center flex flex-col items-center">
              <div className="px-8 max-w-sm">
                <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">Ubah Sampah Jadi Berharga</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-4 font-medium text-sm">Ambil foto barang bekas, biarkan AI memandu Anda.</p>
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
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                  <button onClick={stopCamera} className="absolute top-6 left-6 p-4 bg-white/10 backdrop-blur-md rounded-2xl text-white border border-white/20">✕</button>
               </div>
               <div className="p-8 flex items-center justify-center">
                  <button onClick={() => handleCapture()} className="w-24 h-24 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-2xl border-4 border-green-600 active:scale-90 transition-transform"><div className="w-16 h-16 bg-green-600 rounded-full"></div></button>
               </div>
            </div>
          ) : isCropping ? (
            <div className="fixed inset-0 z-[500] bg-slate-950 flex flex-col">
              <div className="relative flex-1 bg-black"><Cropper image={tempImage!} crop={crop} zoom={zoom} aspect={1} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={(_c, p) => setCroppedAreaPixels(p)} /></div>
              <div className="p-10 bg-slate-950/90 backdrop-blur-md z-10 space-y-6">
                <button onClick={handleCropConfirm} className="w-full bg-green-600 text-white py-5 rounded-[2.5rem] font-black shadow-xl tracking-widest uppercase text-sm">PROSES DETEKSI AI</button>
              </div>
            </div>
          ) : (
            <div className="space-y-6 pb-20 max-w-md mx-auto w-full">
              <div className="relative rounded-[3rem] overflow-hidden shadow-2xl border-4 border-white dark:border-slate-800">
                <img src={image!} className="w-full aspect-square object-cover" />
                {loading && (
                  <div className="absolute inset-0 bg-black/80 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center text-white">
                     <div className="w-20 h-20 border-4 border-white/20 border-t-green-500 rounded-full animate-spin mb-6"></div>
                     <h2 className="text-xl font-black mb-2">Menganalisis Material...</h2>
                     <p className="text-xs font-bold text-slate-400 px-4">AI sedang bekerja. Ini mungkin butuh waktu beberapa detik.</p>
                  </div>
                )}
              </div>

              {result && !loading && (
                <div className="space-y-10 animate-in slide-in-from-bottom-8 duration-700">
                  <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 border border-slate-100 dark:border-slate-800">
                    <h2 className="text-3xl font-black text-slate-800 dark:text-white leading-tight">{result.itemName}</h2>
                    <div className="flex items-center space-x-3 mt-3">
                       <span className="text-[10px] font-black text-green-600 bg-green-50 dark:bg-green-950 px-3 py-1 rounded-full uppercase tracking-widest">{result.materialType}</span>
                       <span className="text-[10px] font-black text-amber-600 bg-amber-50 dark:bg-amber-950 px-3 py-1 rounded-full uppercase tracking-widest">{result.difficulty}</span>
                    </div>
                  </div>

                  <div className="space-y-6 px-1">
                    <h3 className="text-2xl font-black text-slate-800 dark:text-white px-2">Ide Proyek Cerdas</h3>
                    <div className="grid gap-6">
                      {result.diyIdeas.map((idea, idx) => (
                        <div key={idx} className="bg-white dark:bg-slate-900 rounded-[3rem] p-6 border border-slate-100 dark:border-slate-800 space-y-5 shadow-sm group">
                          <div className="relative overflow-hidden rounded-[2rem] aspect-[16/10]">
                             <img src={idea.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                          </div>
                          <div>
                            <h4 className="text-xl font-black text-slate-900 dark:text-white">{idea.title}</h4>
                            <p className="text-sm text-slate-500 mt-2 line-clamp-2 leading-relaxed font-medium">{idea.description}</p>
                          </div>
                          <button 
                            onClick={() => { setSelectedTutorial(idea); setCurrentStep(-1); }}
                            className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-5 rounded-[2rem] font-black text-[10px] uppercase tracking-[0.2em] active:scale-95 transition-all shadow-lg"
                          >
                            LIHAT PANDUAN KERJA
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {!loading && image && !result && (
                <button onClick={() => { setImage(null); startCamera(); }} className="w-full py-4 text-slate-400 font-bold uppercase text-xs tracking-widest">Coba Foto Ulang</button>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="space-y-4 pb-24 max-w-md mx-auto w-full">
           {history.length > 0 ? history.map((item, idx) => (
             <div key={idx} onClick={() => { setResult(item); setImage(item.diyIdeas[0]?.imageUrl || ""); setActiveTab('Scan'); }} className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 flex items-center space-x-5 cursor-pointer active:scale-95 transition-all">
                <div className="w-14 h-14 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-3xl">📦</div>
                <div className="flex-1">
                   <h4 className="font-black text-slate-800 dark:text-slate-100">{item.itemName}</h4>
                   <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{item.materialType}</p>
                </div>
                <div className="text-green-600 font-black">+{item.estimatedPoints}</div>
             </div>
           )) : <p className="text-center py-20 text-slate-400 font-black text-xs uppercase tracking-widest">Belum ada riwayat scan.</p>}
        </div>
      )}

      {/* Tutorial Workshop Overlay - No major changes here */}
      {selectedTutorial && (
        <div className="fixed inset-0 z-[600] bg-white dark:bg-slate-950 flex flex-col animate-in slide-in-from-right duration-300">
           {/* ... existing workshop content ... */}
           <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <button onClick={() => setSelectedTutorial(null)} className="text-slate-400">✕ Tutup</button>
              <h4 className="text-xs font-black uppercase tracking-widest">Workshop Kreatif</h4>
              <div className="w-10"></div>
           </div>
           <div className="flex-1 p-8 overflow-y-auto">
              <h2 className="text-2xl font-black mb-4">{selectedTutorial.title}</h2>
              {currentStep === -1 ? (
                <div className="space-y-6">
                  <p className="font-bold text-slate-500">Alat yang dibutuhkan:</p>
                  <ul className="space-y-2">
                    {selectedTutorial.toolsNeeded.map((t, i) => <li key={i} className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl font-bold">🛠️ {t}</li>)}
                  </ul>
                  <button onClick={() => setCurrentStep(0)} className="w-full bg-green-600 text-white py-5 rounded-2xl font-black">MULAI SEKARANG</button>
                </div>
              ) : currentStep < selectedTutorial.steps.length ? (
                <div className="space-y-6">
                  <div className="w-16 h-16 bg-green-600 text-white rounded-2xl flex items-center justify-center text-2xl font-black mx-auto">{currentStep+1}</div>
                  <p className="text-xl font-bold text-center leading-relaxed">{selectedTutorial.steps[currentStep]}</p>
                  <div className="flex space-x-2">
                     <button onClick={() => setCurrentStep(prev => prev - 1)} className="flex-1 bg-slate-100 dark:bg-slate-800 py-5 rounded-2xl font-black">Kembali</button>
                     <button onClick={() => setCurrentStep(prev => prev + 1)} className="flex-[2] bg-green-600 text-white py-5 rounded-2xl font-black">Lanjut</button>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-8">
                  <div className="text-6xl">🏆</div>
                  <h3 className="text-2xl font-black">Proyek Selesai!</h3>
                  <p className="text-slate-500">Ambil foto hasil karyamu untuk mendapatkan poin.</p>
                  {!completionPhoto ? (
                    <button onClick={() => startCamera(true)} className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-5 rounded-2xl font-black">AMBIL FOTO VERIFIKASI</button>
                  ) : (
                    <button onClick={handleFinishTutorial} className="w-full bg-green-600 text-white py-5 rounded-2xl font-black">KLAIM 250 XP</button>
                  )}
                  {isCompletionCameraActive && (
                    <div className="fixed inset-0 z-[700] bg-black">
                       <video ref={completionVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
                       <button onClick={() => handleCapture(true)} className="absolute bottom-10 left-1/2 -translate-x-1/2 w-20 h-20 bg-white rounded-full border-8 border-green-600"></button>
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
