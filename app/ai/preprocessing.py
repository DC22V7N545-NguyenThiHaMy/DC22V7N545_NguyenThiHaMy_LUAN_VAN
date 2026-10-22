import numpy as np

def normalize(vector):
    vector = np.asarray(vector, dtype=np.float32)
    norm = np.linalg.norm(vector, axis=-1, keepdims=True)
    return vector / np.maximum(norm, 1e-12)

def scale_scores(scores):
    scores = np.maximum(np.asarray(scores, dtype=np.float32), 0)
    maximum = scores.max(initial=0)
    return scores / maximum if maximum > 0 else scores
