from datetime import datetime, timedelta
from types import SimpleNamespace
import numpy as np
import pytest
from app.ai.collaborative_filtering import CollaborativeFiltering
from app.ai.hybrid_recommender import combine_scores
from app.ai.evaluation import ranking_metrics, temporal_split
from app.ai.preprocessing import normalize

def row(uid,pid,kind='view',weight=1,offset=0,idx=1):
    return SimpleNamespace(id=idx,user_id=uid,product_id=pid,interaction_type=kind,interaction_weight=weight,created_at=datetime(2026,1,1)+timedelta(days=offset))

def test_cf_learns_cooccurrence_and_cold_start():
    model=CollaborativeFiltering().fit([row(1,1),row(1,2),row(2,1),row(2,2),row(3,3),row(4,1)],[1,2,3])
    scores=model.scores(4)
    assert scores[1]>scores[2]
    assert np.all(model.scores(999)==0)
    assert np.all(np.diag(model.similarity)==0)

def test_cf_debounces_duplicate_events():
    model=CollaborativeFiltering().fit([row(1,1),row(1,1),row(1,1),row(1,2)],[1,2])
    assert model.matrix.toarray()[0,0]==1

def test_hybrid_formula_and_normalization():
    actual=combine_scores(np.array([2,4,0]),np.array([.8,0,.4]),.6)
    np.testing.assert_allclose(actual,[.7,.6,.2],rtol=1e-6)
    np.testing.assert_allclose(combine_scores([1,0],[0,1],0),[0,1])
    np.testing.assert_allclose(combine_scores([1,0],[0,1],1),[1,0])

def test_metrics_known_ranking():
    m=ranking_metrics([4,2,3],{2},3)
    assert m['precision_at_k']==pytest.approx(1/3)
    assert m['recall_at_k']==1
    assert m['ndcg_at_k']==pytest.approx(1/np.log2(3))
    assert m['hit_rate_at_k']==1
    assert ranking_metrics([1,3],{2},2)['ndcg_at_k']==0

def test_temporal_split_does_not_leak_test_item():
    rows=[row(1,1,offset=0,idx=1),row(1,3,offset=1,idx=2),row(1,2,offset=2,idx=3),row(1,3,offset=3,idx=4)]
    train,test=temporal_split(rows)
    assert test[0][1]==3
    assert {r.product_id for r in train}=={1,2}
    assert all(r.created_at<rows[-1].created_at for r in train)

def test_fixed_vectors_cosine_and_combination():
    a=normalize([3.,4.,0.]);b=normalize([3.,4.,1.])
    assert np.linalg.norm(a)==pytest.approx(1)
    assert float(a@b)>.9
    assert np.isfinite(normalize([0.,0.,0.])).all()

@pytest.mark.skipif(__import__('os').environ.get('RUN_CLIP_TESTS')!='1',reason='Set RUN_CLIP_TESTS=1 for actual pretrained model integration.')
def test_real_clip_image_and_text():
    from PIL import Image
    from app.ai.clip_encoder import get_encoder
    from app.config import ROOT
    model=get_encoder()
    with Image.open(ROOT/'app/static/images/dress-linen.jpg') as image:
        image_vector=model.image(image)
    text_vector=model.text('A burgundy midi shirt dress')
    assert image_vector.shape==text_vector.shape==(512,)
    assert np.linalg.norm(image_vector)==pytest.approx(1,abs=1e-5)
    assert np.linalg.norm(text_vector)==pytest.approx(1,abs=1e-5)
    assert float(image_vector@text_vector)>0
