
import React, { useState, useRef } from 'react';
import { Note, User } from '../types';
import { Plus, X, StickyNote, Image as ImageIcon, Loader2, Maximize2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface NotesViewProps {
  notes: Note[];
  currentUser: User;
  onAddNote: (note: Note) => void;
  onDeleteNote: (id: string) => void;
}

const COLORS = [
  'bg-yellow-100 border-yellow-200 text-yellow-900',
  'bg-blue-100 border-blue-200 text-blue-900',
  'bg-green-100 border-green-200 text-green-900',
  'bg-pink-100 border-pink-200 text-pink-900',
  'bg-purple-100 border-purple-200 text-purple-900',
];

const NotesView: React.FC<NotesViewProps> = ({ notes, currentUser, onAddNote, onDeleteNote }) => {
  const [content, setContent] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [isProcessingImg, setIsProcessingImg] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    const newNote: Note = {
      id: uuidv4(),
      content: content.trim(),
      author: currentUser.name, // Automatically set author
      color: selectedColor,
      createdAt: Date.now(),
      imageUrl: attachedImage || undefined
    };

    onAddNote(newNote);
    setContent('');
    setAttachedImage(null);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteNote(id);
    if (selectedNote?.id === id) setSelectedNote(null);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsProcessingImg(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachedImage(reader.result as string);
        setIsProcessingImg(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="bg-indigo-600 p-2 rounded-lg">
           <StickyNote className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team Notes</h1>
          <p className="text-gray-500 text-sm">Share memos, reminders, and announcements with the staff.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 sticky top-4">
            <h3 className="font-semibold text-gray-800 mb-4">Post a Note</h3>
            <form onSubmit={handleAddNote} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Message</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write your note here..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none h-32 resize-none bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Color</label>
                <div className="flex gap-2">
                  {COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setSelectedColor(c)}
                      className={`w-6 h-6 rounded-full border-2 ${c.split(' ')[0]} ${selectedColor === c ? 'border-gray-600 scale-110' : 'border-transparent'}`}
                    />
                  ))}
                </div>
              </div>
              
              <div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs flex items-center gap-1.5 text-gray-500 hover:text-indigo-600 transition font-medium"
                >
                  <ImageIcon className="w-4 h-4" />
                  {attachedImage ? 'Change Image' : 'Attach Image'}
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleImageSelect}
                />
                
                {isProcessingImg && <p className="text-xs text-gray-400 mt-1 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin"/> Processing...</p>}

                {attachedImage && (
                  <div className="mt-2 relative inline-block">
                    <img src={attachedImage} alt="Preview" className="w-16 h-16 object-cover rounded-lg border border-gray-200" />
                    <button 
                      type="button" 
                      onClick={() => setAttachedImage(null)}
                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              <div className="pt-2">
                  <p className="text-xs text-gray-400 mb-2">Posting as: <span className="font-semibold text-gray-600">{currentUser.name}</span></p>
                  <button
                    type="submit"
                    disabled={!content || isProcessingImg}
                    className="w-full bg-gray-900 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-black transition disabled:opacity-50"
                  >
                    Post Note
                  </button>
              </div>
            </form>
          </div>
        </div>

        <div className="lg:col-span-3">
           {notes.length === 0 ? (
             <div className="h-64 flex flex-col items-center justify-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
               <StickyNote className="w-12 h-12 mb-3 opacity-20" />
               <p className="text-sm">No notes yet. Be the first to post!</p>
             </div>
           ) : (
             <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 auto-rows-min">
               {notes.map(note => (
                 <div 
                    key={note.id} 
                    onClick={() => setSelectedNote(note)}
                    className={`p-5 rounded-xl border shadow-sm relative group transition-all hover:-translate-y-1 hover:shadow-md cursor-pointer ${note.color} flex flex-col`}
                 >
                   <div className="flex justify-between items-start mb-3">
                      <div className="flex-1"></div>
                      <button 
                        onClick={(e) => handleDelete(note.id, e)}
                        className="p-1.5 bg-white/50 rounded-full hover:bg-red-500 hover:text-white text-gray-500 transition z-10"
                        title="Delete Note"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                   </div>
                   
                   {note.imageUrl && (
                     <div className="mb-3 rounded-lg overflow-hidden border border-black/5 bg-white h-32 relative">
                        <img src={note.imageUrl} alt="Attachment" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                            <Maximize2 className="w-6 h-6 text-white drop-shadow-md" />
                        </div>
                     </div>
                   )}
                   
                   <p className="text-sm font-medium whitespace-pre-wrap leading-relaxed mb-6 flex-1 line-clamp-6 break-words">{note.content}</p>
                   
                   <div className="mt-auto flex justify-between items-end border-t border-black/5 pt-3">
                     <span className="text-xs font-bold uppercase tracking-wide opacity-75">{note.author}</span>
                     <span className="text-[10px] opacity-60">{formatDate(note.createdAt)}</span>
                   </div>
                 </div>
               ))}
             </div>
           )}
        </div>
      </div>

      {selectedNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setSelectedNote(null)}>
          <div 
             className={`w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${selectedNote.color}`} 
             onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-black/5 flex justify-between items-center bg-white/30">
               <div>
                  <h3 className="font-bold text-gray-900">{selectedNote.author}'s Note</h3>
                  <p className="text-xs opacity-70">{formatDate(selectedNote.createdAt)}</p>
               </div>
               <button onClick={() => setSelectedNote(null)} className="p-2 hover:bg-black/10 rounded-full transition">
                 <X className="w-5 h-5" />
               </button>
            </div>

            <div className="p-6 overflow-y-auto">
               {selectedNote.imageUrl && (
                 <div className="mb-6 rounded-xl overflow-hidden border border-black/10 shadow-sm bg-white">
                    <img src={selectedNote.imageUrl} alt="Attachment Full" className="w-full h-auto max-h-[50vh] object-contain mx-auto" />
                 </div>
               )}
               <p className="text-base sm:text-lg whitespace-pre-wrap leading-relaxed text-gray-800 font-medium break-words">
                 {selectedNote.content}
               </p>
            </div>

            <div className="p-4 bg-white/30 border-t border-black/5 flex justify-end">
               <button 
                  onClick={() => setSelectedNote(null)}
                  className="px-4 py-2 bg-white/50 hover:bg-white rounded-lg text-sm font-semibold transition shadow-sm"
               >
                 Close
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotesView;
