#import "NVActivityIndicatorAnimationOrbit.h"
#import "NVActivityIndicatorShape.h"

@implementation NVActivityIndicatorAnimationOrbit {
    CFTimeInterval _duration;
    CGFloat _satelliteCoreRatio;
    CGFloat _distanceRatio;
    CGFloat _coreSize;
    CGFloat _satelliteSize;
}

- (instancetype)init {
    self = [super init];
    if (self) {
        _duration = 1.9;
        _satelliteCoreRatio = 0.25;
        _distanceRatio = 1.5; // distance / core size
    }
    return self;
}

- (void)setUpAnimationInLayer:(CALayer *)layer size:(CGSize)size color:(UIColor *)color {
    [self setUpAnimationInLayer:layer size:size color:color speedMultiplier:1.0];
}

- (void)setUpAnimationInLayer:(CALayer *)layer size:(CGSize)size color:(UIColor *)color speedMultiplier:(CGFloat)speedMultiplier {
    _coreSize = size.width / (1 + _satelliteCoreRatio + _distanceRatio);
    _satelliteSize = _coreSize * _satelliteCoreRatio;

    [self ring1InLayer:layer size:size color:color speedMultiplier:speedMultiplier];
    [self ring2InLayer:layer size:size color:color speedMultiplier:speedMultiplier];
    [self coreInLayer:layer size:size color:color speedMultiplier:speedMultiplier];
    [self satelliteInLayer:layer size:size color:color speedMultiplier:speedMultiplier];
}

- (void)ring1InLayer:(CALayer *)layer size:(CGSize)size color:(UIColor *)color speedMultiplier:(CGFloat)speedMultiplier {
    // Scale animation
    CAKeyframeAnimation *scaleAnimation = [CAKeyframeAnimation animationWithKeyPath:@"transform.scale"];
    scaleAnimation.keyTimes = @[@0, @0.45, @0.45, @1];
    scaleAnimation.timingFunction = [CAMediaTimingFunction functionWithName:kCAMediaTimingFunctionLinear];
    scaleAnimation.values = @[@0, @0, @1.3, @2.5];
    scaleAnimation.duration = _duration / speedMultiplier;

    // Opacity animation
    CAKeyframeAnimation *opacityAnimation = [CAKeyframeAnimation animationWithKeyPath:@"opacity"];
    CAMediaTimingFunction *timingFunction = [CAMediaTimingFunction functionWithControlPoints:0.19 :1 :0.22 :1];
    
    opacityAnimation.keyTimes = @[@0, @0.45, @1];
    opacityAnimation.timingFunctions = @[[CAMediaTimingFunction functionWithName:kCAMediaTimingFunctionLinear], timingFunction];
    opacityAnimation.values = @[@1.0, @1.0, @0];
    opacityAnimation.duration = _duration / speedMultiplier;

    // Animation
    CAAnimationGroup *animation = [CAAnimationGroup animation];
    animation.animations = @[scaleAnimation, opacityAnimation];
    animation.duration = _duration / speedMultiplier;
    animation.repeatCount = HUGE_VALF;
    animation.removedOnCompletion = NO;

    // Draw circle
    CALayer *circle = [NVActivityIndicatorShapeHelper layerWithShape:NVActivityIndicatorShapeCircle size:CGSizeMake(_coreSize, _coreSize) color:color];
    CGRect frame = CGRectMake((layer.bounds.size.width - _coreSize) / 2,
                             (layer.bounds.size.height - _coreSize) / 2,
                             _coreSize,
                             _coreSize);

    circle.frame = frame;
    [circle addAnimation:animation forKey:@"animation"];
    [layer addSublayer:circle];
}

- (void)ring2InLayer:(CALayer *)layer size:(CGSize)size color:(UIColor *)color speedMultiplier:(CGFloat)speedMultiplier {
    // Scale animation
    CAKeyframeAnimation *scaleAnimation = [CAKeyframeAnimation animationWithKeyPath:@"transform.scale"];
    scaleAnimation.keyTimes = @[@0, @0.55, @0.55, @1];
    scaleAnimation.timingFunction = [CAMediaTimingFunction functionWithName:kCAMediaTimingFunctionLinear];
    scaleAnimation.values = @[@0, @0, @1.3, @2.6];
    scaleAnimation.duration = _duration / speedMultiplier;

    // Opacity animation
    CAKeyframeAnimation *opacityAnimation = [CAKeyframeAnimation animationWithKeyPath:@"opacity"];
    CAMediaTimingFunction *timingFunction = [CAMediaTimingFunction functionWithControlPoints:0.19 :1 :0.22 :1];
    
    opacityAnimation.keyTimes = @[@0, @0.55, @0.65, @1];
    opacityAnimation.timingFunctions = @[[CAMediaTimingFunction functionWithName:kCAMediaTimingFunctionLinear], timingFunction];
    opacityAnimation.values = @[@1.0, @1.0, @0.3, @0];
    opacityAnimation.duration = _duration / speedMultiplier;

    // Animation
    CAAnimationGroup *animation = [CAAnimationGroup animation];
    animation.animations = @[scaleAnimation, opacityAnimation];
    animation.duration = _duration / speedMultiplier;
    animation.repeatCount = HUGE_VALF;
    animation.removedOnCompletion = NO;

    // Draw circle
    CALayer *circle = [NVActivityIndicatorShapeHelper layerWithShape:NVActivityIndicatorShapeCircle size:CGSizeMake(_coreSize, _coreSize) color:color];
    CGRect frame = CGRectMake((layer.bounds.size.width - _coreSize) / 2,
                             (layer.bounds.size.height - _coreSize) / 2,
                             _coreSize,
                             _coreSize);

    circle.frame = frame;
    [circle addAnimation:animation forKey:@"animation"];
    [layer addSublayer:circle];
}

- (void)coreInLayer:(CALayer *)layer size:(CGSize)size color:(UIColor *)color speedMultiplier:(CGFloat)speedMultiplier {
    CAMediaTimingFunction *inTimingFunction = [CAMediaTimingFunction functionWithControlPoints:0.7 :0 :1 :0.5];
    CAMediaTimingFunction *outTimingFunction = [CAMediaTimingFunction functionWithControlPoints:0 :0.7 :0.5 :1];
    CAMediaTimingFunction *standByTimingFunction = [CAMediaTimingFunction functionWithName:kCAMediaTimingFunctionLinear];

    // Scale animation
    CAKeyframeAnimation *scaleAnimation = [CAKeyframeAnimation animationWithKeyPath:@"transform.scale"];
    scaleAnimation.keyTimes = @[@0, @0.45, @0.55, @1];
    scaleAnimation.timingFunctions = @[inTimingFunction, standByTimingFunction, outTimingFunction];
    scaleAnimation.values = @[@1, @1.3, @1.3, @1];
    scaleAnimation.duration = _duration / speedMultiplier;
    scaleAnimation.repeatCount = HUGE_VALF;
    scaleAnimation.removedOnCompletion = NO;

    // Draw circle
    CALayer *circle = [NVActivityIndicatorShapeHelper layerWithShape:NVActivityIndicatorShapeCircle size:CGSizeMake(_coreSize, _coreSize) color:color];
    CGRect frame = CGRectMake((layer.bounds.size.width - _coreSize) / 2,
                             (layer.bounds.size.height - _coreSize) / 2,
                             _coreSize,
                             _coreSize);

    circle.frame = frame;
    [circle addAnimation:scaleAnimation forKey:@"animation"];
    [layer addSublayer:circle];
}

- (void)satelliteInLayer:(CALayer *)layer size:(CGSize)size color:(UIColor *)color speedMultiplier:(CGFloat)speedMultiplier {
    // Rotate animation
    CAKeyframeAnimation *rotateAnimation = [CAKeyframeAnimation animationWithKeyPath:@"position"];
    
    UIBezierPath *path = [UIBezierPath bezierPathWithArcCenter:CGPointMake(layer.bounds.size.width / 2, layer.bounds.size.height / 2)
                                                        radius:(size.width - _satelliteSize) / 2
                                                    startAngle:M_PI * 1.5
                                                      endAngle:M_PI * 1.5 + 4 * M_PI
                                                     clockwise:YES];
    rotateAnimation.path = path.CGPath;
    rotateAnimation.duration = (_duration * 2) / speedMultiplier;
    rotateAnimation.repeatCount = HUGE_VALF;
    rotateAnimation.removedOnCompletion = NO;

    // Draw circle
    CALayer *circle = [NVActivityIndicatorShapeHelper layerWithShape:NVActivityIndicatorShapeCircle size:CGSizeMake(_satelliteSize, _satelliteSize) color:color];
    CGRect frame = CGRectMake(0, 0, _satelliteSize, _satelliteSize);

    circle.frame = frame;
    [circle addAnimation:rotateAnimation forKey:@"animation"];
    [layer addSublayer:circle];
}

@end
