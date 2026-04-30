import { useState } from 'react';
import { createClient } from '../../lib/supabase'; // Pfad ggf. anpassen

export function useImageManager(ferrataId: string) {
  const supabase = createClient();
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setNewFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeNewFile = (index: number) => {
    setNewFiles(prev => prev.filter((_, i) => i !== index));
  };

  const clearNewFiles = () => setNewFiles([]);

  const uploadImages = async (folderPrefix: string = 'update') => {
    setIsUploading(true);
    const uploadedUrls: string[] = [];
    try {
      for (const file of newFiles) {
        const fileExt = file.name.split('.').pop();
        const path = `${ferrataId}/${folderPrefix}_${Date.now()}_${Math.random()}.${fileExt}`;
        const { error } = await supabase.storage.from('reports').upload(path, file);
        if (error) throw error;
        const { data: urlData } = supabase.storage.from('reports').getPublicUrl(path);
        uploadedUrls.push(urlData.publicUrl);
      }
      return uploadedUrls;
    } catch (err) {
      throw err;
    } finally {
      setIsUploading(false);
    }
  };

  return { newFiles, isUploading, handleImageSelect, removeNewFile, clearNewFiles, uploadImages };
}