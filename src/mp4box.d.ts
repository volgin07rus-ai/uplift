declare module 'mp4box' {
  /** Буфер, который MP4Box требует пометить смещением в файле. */
  export interface MP4ArrayBuffer extends ArrayBuffer {
    fileStart: number
  }

  export interface MP4VideoTrack {
    id: number
    codec: string
    timescale: number
    duration: number
    movie_duration: number
    nb_samples: number
    video: { width: number; height: number }
  }

  export interface MP4Info {
    duration: number
    timescale: number
    videoTracks: MP4VideoTrack[]
    audioTracks: unknown[]
    tracks: MP4VideoTrack[]
  }

  export interface MP4Sample {
    number: number
    track_id: number
    timescale: number
    cts: number
    dts: number
    duration: number
    is_sync: boolean
    data: ArrayBuffer
  }

  /** Мини-описание бокса, достаточное для чтения avcC / hvcC / vpcC / av1C. */
  export interface MP4Box {
    write(stream: DataStreamInstance): void
  }

  export interface MP4SampleEntry {
    avcC?: MP4Box
    hvcC?: MP4Box
    vpcC?: MP4Box
    av1C?: MP4Box
  }

  export interface MP4Track {
    mdia: {
      minf: {
        stbl: {
          stsd: { entries: MP4SampleEntry[] }
        }
      }
    }
  }

  export interface DataStreamInstance {
    buffer: ArrayBuffer
    endianness: boolean
  }

  export interface DataStreamConstructor {
    new (
      arrayBuffer?: ArrayBuffer,
      byteOffset?: number,
      endianness?: boolean,
    ): DataStreamInstance
    BIG_ENDIAN: boolean
    LITTLE_ENDIAN: boolean
  }

  export interface MP4File {
    onReady: ((info: MP4Info) => void) | null
    onError: ((e: string) => void) | null
    onSamples:
      | ((trackId: number, user: unknown, samples: MP4Sample[]) => void)
      | null
    appendBuffer(data: MP4ArrayBuffer): number
    start(): void
    stop(): void
    flush(): void
    getTrackById(id: number): MP4Track
    setExtractionOptions(
      trackId: number,
      user?: unknown,
      options?: { nbSamples?: number },
    ): void
  }

  export function createFile(): MP4File
  export const DataStream: DataStreamConstructor

  const MP4Box: {
    createFile: typeof createFile
    DataStream: DataStreamConstructor
  }
  export default MP4Box
}
