import { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { uploadReceiptFile, createReceipt } from '../receipts.service';
import { validateReceiptFile, getFileType } from '../../../lib/utils/file';
import { useUiStore } from '../../../store/ui.store';
import type { AuthUser } from '../../../types';

const schema = z.object({
  title: z.string().min(1, '請輸入收據標題'),
  amount: z.coerce.number().positive('金額必須大於 0'),
  note: z.string().optional(),
});

type FormData = z.input<typeof schema>;

type FormValues = z.output<typeof schema>;

interface Props {
  user: AuthUser;
  onUploaded: () => void;
}

export default function ReceiptUploadForm({ user, onUploaded }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const addToast = useUiStore((s) => s.addToast);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData, unknown, FormValues>({
    resolver: zodResolver(schema),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setFileError(null);
    if (f) {
      const err = validateReceiptFile(f);
      if (err) {
        setFileError(err);
        setFile(null);
      }
    }
  };

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    if (!file) {
      setFileError('請選擇收據檔案');
      return;
    }

    setUploading(true);
    try {
      const email = user.email ?? user.uid;
      const fileUrl = await uploadReceiptFile(file, email);
      await createReceipt({
        title: data.title,
        amount: data.amount,
        note: data.note ?? '',
        fileUrl,
        fileType: getFileType(file),
        uploadedById: email,
        uploadedByName: user.displayName ?? user.email ?? '未知',
      });
      addToast('收據上傳成功', 'success');
      reset();
      setFile(null);
      onUploaded();
    } catch (err) {
      console.error('Upload failed:', err);
      addToast('上傳失敗，請重試', 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="receipt-upload-card card">
      <h3>上傳收據</h3>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="form-field">
          <label className="form-label">標題</label>
          <input className="form-input" {...register('title')} placeholder="例如：文具採購" />
          {errors.title && <span className="form-error">{errors.title.message}</span>}
        </div>

        <div className="form-field">
          <label className="form-label">金額 (HKD)</label>
          <input className="form-input" type="number" step="0.01" {...register('amount')} placeholder="0.00" />
          {errors.amount && <span className="form-error">{errors.amount.message}</span>}
        </div>

        <div className="form-field">
          <label className="form-label">備註 (選填)</label>
          <textarea className="form-input" rows={3} {...register('note')} placeholder="備註說明" />
        </div>

        <div className="form-field">
          <label className="form-label">收據檔案 (JPG / PNG / PDF)</label>
          <input className="form-input" type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={handleFileChange} />
          {fileError && <span className="form-error">{fileError}</span>}
          {file && <span className="form-hint">已選擇：{file.name}</span>}
        </div>

        <button className="btn btn-primary" type="submit" disabled={uploading}>
          {uploading ? '上傳中…' : '上傳收據'}
        </button>
      </form>
    </div>
  );
}
