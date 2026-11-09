# GalleryBridge

Expose local stash through common book library server routes.

TODO

## Configuration

- `SEARCH_PATH`: Path to the directory
- `THUMBNAIL_BLUR_BACKGROUND`: Fit the cover into a 2:3 portrait frame, commonly used by clients (default: `true`)
- `THUMBNAIL_CACHE_PATH`: Directory for cached thumbnails (default: system temporary directory; Docker: `/cache/thumbnails`)

Example compose:

```yaml
services:
  gallerybridge:
    image: ghcr.io/duncannah/gallerybridge:latest
    ports:
      - "3000:3000"
    volumes:
      - ./library:/library:ro
      - thumbnail-cache:/cache

volumes:
  thumbnail-cache:
```

### Expected directory structure

- Artist/Publisher
  - Book/Post/Entry
    - Loose JPG, JPEG, and PNG files

## Simulated servers

### Komga

Smallest possible implementation of the [Komga](https://github.com/gotson/komga) API, enough to keep [Aidoku](https://github.com/Aidoku/Aidoku) happy for basic reading.

Any credentials are accepted.
