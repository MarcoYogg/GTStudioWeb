import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '../../../features/auth/auth.store';
import { createEvent, updateEvent } from '../schedule.service';
import { useUiStore } from '../../../store/ui.store';
import type { ScheduleEvent } from '../../../types';

const schema = z.object({
  title: z.string().min(1, '請輸入活動標題'),
  date: z.string().min(1, '請選擇日期'),
  timeStart: z.string().optional(),
  timeEnd: z.string().optional(),
  location: z.string().optional(),
  description: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  initialDate: string;
  event: ScheduleEvent | null;
  onClose: () => void;
  onDone: () => void;
}

export default function EventFormModal({ initialDate, event, onClose, onDone }: Props) {
  const user = useAuthStore((s) => s.user);
  const addToast = useUiStore((s) => s.addToast);
  const isEdit = event !== null;
  const [working, setWorking] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: event
      ? {
          title: event.title,
          date: event.date,
          timeStart: event.timeStart || '',
          timeEnd: event.timeEnd || '',
          location: event.location || '',
          description: event.description || '',
        }
      : { date: initialDate },
  });

  const onSubmit = async (data: FormData) => {
    if (!user?.email) return;
    setWorking(true);
    try {
      if (isEdit && event) {
        await updateEvent(event.id, {
          title: data.title,
          date: data.date,
          timeStart: data.timeStart ?? '',
          timeEnd: data.timeEnd ?? '',
          location: data.location ?? '',
          description: data.description ?? '',
        });
        addToast('活動已更新！', 'success');
      } else {
        await createEvent({
          title: data.title,
          date: data.date,
          timeStart: data.timeStart ?? '',
          timeEnd: data.timeEnd ?? '',
          location: data.location ?? '',
          description: data.description ?? '',
          createdBy: user.email,
        });
        addToast('活動已建立！', 'success');
      }
      onDone();
    } catch {
      addToast(isEdit ? '更新失敗' : '建立失敗', 'error');
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{isEdit ? '編輯活動' : '新增活動'}</h3>
          <button type="button" className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="modal-body">
            <div className="form-field">
              <label className="form-label">標題</label>
              <input className="form-input" {...register('title')} placeholder="活動名稱" />
              {errors.title && <span className="form-error">{errors.title.message}</span>}
            </div>
            <div className="form-row">
              <div className="form-field">
                <label className="form-label">日期</label>
                <input className="form-input" type="date" {...register('date')} />
                {errors.date && <span className="form-error">{errors.date.message}</span>}
              </div>
              <div className="form-field">
                <label className="form-label">開始時間</label>
                <input className="form-input" type="time" {...register('timeStart')} />
              </div>
              <div className="form-field">
                <label className="form-label">結束時間</label>
                <input className="form-input" type="time" {...register('timeEnd')} />
              </div>
            </div>
            <div className="form-field">
              <label className="form-label">地點 (選填)</label>
              <input className="form-input" {...register('location')} placeholder="地點" />
            </div>
            <div className="form-field">
              <label className="form-label">說明 (選填)</label>
              <textarea className="form-input" rows={3} {...register('description')} placeholder="活動說明" />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>取消</button>
            <button type="submit" className="btn btn-primary" disabled={working}>
              {working ? (isEdit ? '更新中…' : '建立中…') : (isEdit ? '更新活動' : '建立活動')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
