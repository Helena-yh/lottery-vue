import {
  BaseMessage, ConversationType, FileMessage, GIFMessage, IAReceivedMessage, IConversationOption,
  IGIFMessageBody, IImageMessageBody, ISightMessageBody, ImageMessage, SightMessage,
} from '@rongcloud/imlib-next';
import { IRCKitCachedMessage } from '..';

const validConversationTypes = [ConversationType.PRIVATE, ConversationType.GROUP, ConversationType.SYSTEM];

/** 会话参数非法性校验 */
export const isInvalidConversation = (conversation: IConversationOption): boolean => {
  if (!conversation) {
    return true;
  }
  const { targetId, conversationType, channelId } = conversation;
  return !targetId || typeof targetId !== 'string'
    || validConversationTypes.indexOf(conversationType) === -1
    || (!!channelId && typeof channelId !== 'string');
};

export const isSameConversation = (a: IConversationOption, b: IConversationOption): boolean => a.targetId === b.targetId && a.conversationType === b.conversationType && a.channelId === b.channelId;

/** 根据会话 targetId、conversationType、channelId 生成的唯一标识 */
export const trans2ConversationKey = (conversation: IConversationOption): string => `[${conversation.targetId}][${conversation.conversationType}][${conversation.channelId || ''}]`;

export const isPrivOrGroupConversation = (conversation: IConversationOption): boolean => conversation.conversationType === ConversationType.PRIVATE || conversation.conversationType === ConversationType.GROUP;

const calcPosition = function(width: number, height: number, opts: { maxWidth: number, maxHeight: number, scale: number }) {
  const isheight = width < height;
  const scale = isheight ? height / width : width / height;
  let zoom, x = 0,
      y = 0,
      w, h;

  const gtScale = function() {
      if (isheight) {
          zoom = width / 100;
          w = 100;
          h = height / zoom;
          y = (h - opts.maxHeight) / 2;
      } else {
          zoom = height / 100;
          h = 100;
          w = width / zoom;
          x = (w - opts.maxWidth) / 2;
      }
      return {
          w: w,
          h: h,
          x: -x,
          y: -y
      };
  };

  const ltScale = function() {
      if (isheight) {
          zoom = height / opts.maxHeight;
          h = opts.maxHeight;
          w = width / zoom;
      } else {
          zoom = width / opts.maxWidth;
          w = opts.maxWidth;
          h = height / zoom;
      }
      return {
          w: w,
          h: h,
          x: -x,
          y: -y
      };
  };
  return scale > opts.scale ? gtScale() : ltScale();
};

/**
 * 为图片或视频生成缩略图
 * @param element - HTMLImageElement | HTMLVideoElement
 */
const createImageThumbnail = (element: HTMLImageElement | HTMLVideoElement): string => {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d')!;
  const maxHeight = 160;
  const maxWidth = 160;
  const scale = 2.4;
  const pos = calcPosition(element.width, element.height, { maxHeight, maxWidth, scale });
  canvas.width = Math.min(pos.w, maxWidth);
  canvas.height = Math.min(pos.h, maxHeight);
  context.drawImage(element, pos.x, pos.y, pos.w, pos.h);

  let base64 = canvas.toDataURL('image/png', 0.5);
  const reg = /data:image\/[^;]+;base64,/;
  base64 = base64.replace(reg, '');
  return base64;
};

export const formatTime = (time: number): {
  year: string, month: string, day: string, hour: string, minute: string, weekDay: number,
} => {
  if (!time) time = Date.now();
  const date = new Date(time);
  const year = `${date.getFullYear()}`;
  const month = `${date.getMonth() + 1}`;
  const day = `${date.getDate()}`;
  const weekDay = date.getDay();

  let hour = `${date.getHours()}`;
  if (hour.length < 2) {
    hour = `0${hour}`;
  }
  let minute = `${date.getMinutes()}`;
  if (minute.length < 2) {
    minute = `0${minute}`;
  }

  return {
    year, month, day, hour, minute, weekDay,
  };
};

/**
 * 获取时间长度, 单位 s
 */
export const formatTimeLength = (time: number): string => {
  const minutes = Math.floor(time / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (time < 60) return `0:${time.toString().padStart(2, '0')}`;
  time = Math.floor(time)

  return `${days > 0 ? `${days}d ` : ''}${
    hours > 0 ? `${(hours % 24).toString().padStart(2, '0').trim()}:` : ''}${
    minutes > 0 ? `${(minutes % 60).toString().padStart(2, '0')}:` : ''}${
    (time % 60).toString().padStart(2, '0')}`.trim();
};

/**
 * 格式化文件大小
 * @param bytes 文件大小，单位为 Byte
 * @returns
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) {
    return bytes + " B";
  } else if (bytes < 1024 * 1024) {
    return (bytes / 1024).toFixed(2) + " KB";
  } else if (bytes < 1024 * 1024 * 1024) {
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  } else if (bytes < 1024 * 1024 * 1024 * 1024) {
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
  } else {
    return (bytes / (1024 * 1024 * 1024 * 1024)).toFixed(2) + " TB";
  }
}
const createSightMessage = (file: File) => new Promise<BaseMessage<ISightMessageBody> | null>((resolve) => {
  const video = document.createElement('video');
  const destroy = () => {
    video.pause();
    video.src = '';
  };
  const url = URL.createObjectURL(file);
  video.onloadeddata = () => {
    URL.revokeObjectURL(url);

    const { duration, videoHeight, videoWidth } = video;
    if (duration > 120) {
      destroy();
      // 视频时长超过 120s，创建文件消息
      // TODO: 后续需要继续检查 video 的编码是否为 h.264 + aac，否则移动端可能无法解析
      resolve(null);
      return;
    }

    video.width = videoWidth;
    video.height = videoHeight;
    const thumbnail = createImageThumbnail(video);
    destroy();

    resolve(new SightMessage({
      name: file.name,
      size: file.size,
      duration,
      content: thumbnail,
      sightUrl: '',
    }));
  };
  // 视频加载失败，创建文件消息
  video.onerror = () => {
    URL.revokeObjectURL(url);
    resolve(null);
  };
  video.muted = true;
  video.src = url;
  video.play();
});

const createGifMessage = (file: File) => new Promise<BaseMessage<IGIFMessageBody> | null>((resolve) => {
  const img = new Image();
  const url = URL.createObjectURL(file);
  img.onload = () => resolve(new GIFMessage({
    gifDataSize: file.size,
    remoteUrl: url,
    width: img.width,
    height: img.height,
  }));
  img.onerror = (e) => {
    URL.revokeObjectURL(url);
    resolve(null);
  };
  img.src = url;
});

const createImageMessage = (file: File) => new Promise<BaseMessage<IImageMessageBody> | null>((resolve) => {
  const img = new Image();
  const url = URL.createObjectURL(file);
  img.onload = () => {
    const thumbnail = createImageThumbnail(img);
    resolve(new ImageMessage({ content: thumbnail, imageUri: url }));
  };
  img.onerror = () => {
    resolve(null);
    URL.revokeObjectURL(url);
  };
  img.src = url;
});

/**
 * 解析文件类型并生成对应的消息类型数据
 * @param file
 * @returns
 */
export const parseFileToMessage = async (file: File) => {
  let message: BaseMessage | null = null;
  switch (file.type) {
    case 'video/mp4':
      // 检测文件类型与编码，若文件类型为 H.264 + AAC 视频文件，则创建视频消息，否则创建文件消息
      message = await createSightMessage(file);
      break;
    case 'image/gif':
      // 尝试加载 Gif 图片，若加载成功，则创建 Gif 消息，否则创建文件消息
      if (file.size < 2 * 1024 * 1024) {
        // Gif 图片不可超出 2MB
        message = await createGifMessage(file);
      }
      break;
    case 'image/jpeg':
    case 'image/jpg':
    case 'image/png':
      // 尝试加载图片，若加载成功，则创建图片消息，否则创建文件消息
      if (file.size < 100 * 1024 * 1024) {
        // 图片尺寸不可超出 5MB
        message = await createImageMessage(file);
      }
      break;
  }
  return message || new FileMessage({
    name: file.name, size: file.size, type: file.type, fileUrl: '',
  });
};

export const formatBase64Image = (base64: string) => {
  if (!base64) return
  const reg = /data:image\/[^;]+;base64,/;
  return reg.test(base64) ? base64 : `data:image/png;base64,${base64}`;
}

export const transIAReceivedMessage = (message: IAReceivedMessage): IRCKitCachedMessage => {
  return {
    ...message,
    transactionId: NaN,
    progress: 100,
    file: undefined,
  };
}

/**
 * URL 正则匹配，支持识别带协议头的 URL
 * 匹配规则：
 * 1. 协议头 + 域名 + 端口 + 路径
 * 2. 协议头 + ip + 端口 + 路径
 * 3. 协议头 + localhost + 端口 + 路径
 * @param content
 * @returns
 */
export const formatTxtMessageContent = (content: string) => {
  const ipReg = '(?:(?:25[0-5]|2[0-4]\\d|1\\d{2}|[1-9]\\d|\\d)\\.){3}(?:25[0-5]|2[0-4]\\d|1\\d{2}|[1-9]\\d|\\d)';
  const hostReg = '(?!@)(?:[a-z0-9-@_]{1,36}\\.)+[a-z]{2,6}';
  const portReg = '(?:\\:\\d{1,5})?';
  const localhost = '(?:localhost)';
  const pathReg = '(?:(?:/[a-zA-Z0-9.,;?\\\'+&%$#=~_\\-!()*\\|\\/]*)?)';
  const urlRegex = new RegExp('(((https?):\/\/(?:(' + ipReg + ')|(' + hostReg + ')|' + localhost + ')' + portReg + pathReg + '))','ig');
  const matches = content.match(urlRegex);

  const mailRegex = new RegExp('([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)','ig');
  const matches2Mail = content.match(mailRegex);

  const conform2rule: { type: string, val: string, index: number }[] = [];
  matches?.forEach((item) => {
    conform2rule.push({ type: 'url', val: item, index: content.indexOf(item, 0) });
  });


  matches2Mail?.forEach((item) => {
    conform2rule.push({ type: 'mail', val: item, index: content.indexOf(item, 0) })
  });



  if (conform2rule.length <= 0) {
    return {
      type: 0,
      content: [{content, type: 'text'}],
      position: []
    };
  }

  const recognizedContent = [];
  let currentPosition = 0;
  const positions: number[] = [];

  conform2rule.sort((a, b) => a.index - b.index)
  conform2rule.forEach((match) => {
    const splitIndex = content.indexOf(match.val, currentPosition);
    if (splitIndex > currentPosition) {
      recognizedContent.push({
        content: content.substring(currentPosition, splitIndex),
        type: 'text'
      });
    }
    recognizedContent.push({
      content: match.val,
      type: match.type
    });
    positions.push(recognizedContent.length);
    currentPosition = splitIndex + match.val.length;
  });


  if (currentPosition < content.length) {
    recognizedContent.push({
      content: content.substring(currentPosition),
      type: 'text',
    });
  }

  return {
    type: 1,
    content: recognizedContent,
    position: positions
  };
}

export function findLastIndex<T>(array: Array<T>, predicate: (item: T) => boolean): number {
  let l = array.length;
  for (let i = l - 1; i > -1; i--) {
    if (predicate(array[i])) {
      return i;
    }
  }
  return -1;
}
