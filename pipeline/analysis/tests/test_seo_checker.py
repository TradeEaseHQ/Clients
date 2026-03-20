from pipeline.analysis.seo_checker import check_seo_gaps


def test_all_gaps():
    html = '<html><head><title>Test</title></head><body><h2>Hello</h2></body></html>'
    result = check_seo_gaps(html, pagespeed_score=45)
    assert result['checks_passed'] == 0
    assert result['pagespeed_mobile'] == 45
    assert len(result['gaps']) == 5


def test_no_gaps():
    html = '''<html><head>
    <meta name="description" content="Professional house cleaning in Austin, TX.">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta property="og:title" content="Test">
    <script type="application/ld+json">{}</script>
    </head><body><h1>Clean</h1></body></html>'''
    result = check_seo_gaps(html)
    assert result['checks_passed'] == 5
    assert result['gaps'] == []
    assert 'pagespeed_mobile' not in result


def test_meta_description_reversed_order():
    # Content attribute before name attribute (common in real CMS sites)
    html = '<html><head><meta content="Professional house cleaning service in Austin." name="description"></head><body><h1>Title</h1></body></html>'
    result = check_seo_gaps(html)
    assert result['meta_description'] is True, "Should detect meta description even with reversed attribute order"


def test_empty_html():
    result = check_seo_gaps("")
    assert result['checks_passed'] == 0
    assert len(result['gaps']) == 5
