'use client';

import { useId, useRef, useState } from 'react';
import {
  isSupportedImageContentType,
  MAX_IMAGE_UPLOAD_BYTES,
  MAX_IMAGE_UPLOAD_SIZE_MB,
} from '@/lib/validation';
import { ImageUploadFieldView } from './image-upload-field-view';

interface ImageUploadFieldProps {
  pageId?: string;
  kind: 'avatar' | 'project';
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  helpText?: string;
  onUploadingChange?: (uploading: boolean) => void;
}

export function useImageUploadField(props: ImageUploadFieldProps) {
  const {
    pageId,
    kind,
    label,
    value,
    onChange,
    placeholder,
    helpText,
    onUploadingChange,
  } = props;
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'error' | 'success'>(
    'success',
  );

  function updateMessage(nextMessage: string, type: 'error' | 'success') {
    setMessage(nextMessage);
    setMessageType(type);
  }

  function setUploadingState(nextUploading: boolean) {
    setUploading(nextUploading);
    onUploadingChange?.(nextUploading);
  }

  async function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0];
    event.target.value = '';

    if (!selectedFile) {
      return;
    }

    if (!pageId) {
      updateMessage('Create the page first before uploading images.', 'error');
      return;
    }

    if (!isSupportedImageContentType(selectedFile.type)) {
      updateMessage(
        'Only JPG, PNG, WebP, GIF, and AVIF images are supported.',
        'error',
      );
      return;
    }

    if (selectedFile.size > MAX_IMAGE_UPLOAD_BYTES) {
      updateMessage(
        `Images must be ${MAX_IMAGE_UPLOAD_SIZE_MB}MB or smaller.`,
        'error',
      );
      return;
    }

    setUploadingState(true);
    setMessage('');

    try {
      const formData = new FormData();
      formData.append('pageId', pageId);
      formData.append('kind', kind);
      formData.append('file', selectedFile);

      const response = await fetch('/api/uploads/images', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error ?? 'Failed to upload image');
      }

      if (!data?.url || typeof data.url !== 'string') {
        throw new Error('Upload finished without a file URL.');
      }

      onChange(data.url);
      updateMessage('Image uploaded successfully.', 'success');
    } catch (error) {
      updateMessage(
        error instanceof Error ? error.message : 'Failed to upload image.',
        'error',
      );
    } finally {
      setUploadingState(false);
    }
  }

  const preview = value.trim();
  const canUpload = Boolean(pageId);

  return {
    inputId,
    label,
    preview,
    kind,
    canUpload,
    uploading,
    fileInputRef,
    onChange,
    setMessage,
    handleFileSelect,
    value,
    messageType,
    placeholder,
    helpText,
    message,
  };
}

export function ImageUploadField(props: ImageUploadFieldProps) {
  return <ImageUploadFieldView {...useImageUploadField(props)} />;
}
